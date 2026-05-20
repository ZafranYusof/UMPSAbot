"""
Parse UMPSA Course Catalog PDF - v6 (Final)
Key insight: sections and days are 1-per-section, but time/loc/mode/cap have 2+ rows per section.
Assign time rows to sections by y-range (section owns all rows from its y to next section's y).
"""

import fitz
import json
import re
from collections import Counter

PDF_PATH = r'C:\Users\zafra\.openclaw\media\inbound\COURSE_CATALOG_IJA_copy---97a82593-dbfa-44c5-967d-d0f6b17fd2ea.pdf'
OUTPUT_PATH = r'C:\Users\zafra\umpsa-chatbot\scripts\catalog_data.json'

MODE_MAP = {'L': 'lecture', 'B': 'lab', 'T': 'tutorial'}
COURSE_CODE_RE = re.compile(r'^[A-Z]{2,5}\d{3,4}[A-Z]?$')
TIME_RE = re.compile(r'(\d{2}:\d{2})-(\d{2}:\d{2})')
VALID_DAYS = {'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'}


def classify_block(x0, x1):
    """Classify block by x-position."""
    if 240 <= x0 <= 260 and x1 <= 270:
        return 'sec'
    if 260 <= x0 <= 285 and x1 <= 295:
        return 'day'
    if 285 <= x0 <= 325 and x1 <= 340:
        return 'time'
    if 335 <= x0 <= 395 and x1 <= 400:
        return 'loc'
    if 395 <= x0 <= 415 and x1 <= 420:
        return 'mode'
    if 415 <= x0 <= 435 and x1 <= 450:
        return 'cap'
    if 435 <= x0 <= 500:
        return 'exam'
    if x0 >= 500:
        return 'staff'
    return None


def extract_items(blocks, col_name, validator):
    """Extract items for a column, splitting multi-line blocks into per-line items."""
    items = []
    for b in blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        text_stripped = text.strip()
        if not text_stripped:
            continue
        
        col = classify_block(x0, x1)
        if col != col_name:
            continue
        
        lines = text_stripped.split('\n')
        num_lines = len(lines)
        line_height = (y1 - y0) / num_lines if num_lines > 0 else (y1 - y0)
        
        for idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            val = validator(line)
            if val is not None:
                line_y = y0 + idx * line_height + line_height / 2
                items.append((val, line_y))
    
    items.sort(key=lambda x: x[1])
    return items


def parse_page(page, page_num):
    """Parse a single page."""
    blocks = page.get_text('blocks')
    
    is_course_page = False
    faculty = None
    
    for b in blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        text = text.strip()
        if text == "COURSE TIMETABLE":
            is_course_page = True
        if text.startswith("Faculty :") or text.startswith("Faculty:"):
            lines = text.split('\n')
            if len(lines) > 1:
                faculty = lines[1].strip()
    
    if not is_course_page:
        return [], faculty
    
    # Extract course metadata
    course_metas = extract_courses(blocks)
    if not course_metas:
        return [], faculty
    
    # Find semester boundaries
    semester_headers = []
    for b in blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        text = text.strip()
        if "Semester I Academic Session" in text:
            semester_headers.append(('SEM1-2025/2026', y0))
        elif "Semester II Academic Session" in text:
            semester_headers.append(('SEM2-2025/2026', y0))
    semester_headers.sort(key=lambda x: x[1])
    
    # Extract column items
    sec_items = extract_items(blocks, 'sec', 
        lambda l: l if l != 'Sec' and re.match(r'^[\dA-Z]+$', l) else None)
    day_items = extract_items(blocks, 'day',
        lambda l: l if l in VALID_DAYS else None)
    time_items = extract_items(blocks, 'time',
        lambda l: l if TIME_RE.match(l) else None)
    loc_items = extract_items(blocks, 'loc',
        lambda l: l if l != 'Loc' and 'Semester' not in l and 'Academic' not in l else None)
    mode_items = extract_items(blocks, 'mode',
        lambda l: l if l in ('L', 'B', 'T') else None)
    cap_items = extract_items(blocks, 'cap',
        lambda l: int(l) if re.match(r'^\d+$', l) else None)
    
    if not time_items or not sec_items:
        return [], faculty
    
    # === Key logic: assign time rows to sections ===
    # Each section entry has exactly 1 day entry at the same y.
    # Each section "owns" all time/loc/mode/cap rows from its y to the next section's y.
    # Sections and days are 1:1 paired by y-proximity.
    
    # Pair sections with days
    Y_TOL = 5
    
    def find_nearest_item(items, target_y, tol=Y_TOL):
        best = None
        best_dist = tol + 1
        for val, y in items:
            dist = abs(y - target_y)
            if dist < best_dist:
                best_dist = dist
                best = val
        return best
    
    # Build section entries with their y-ranges
    section_entries = []  # [{sec, day, y_start, y_end}]
    
    for i, (sec_val, sec_y) in enumerate(sec_items):
        # Find the day for this section
        day_val = find_nearest_item(day_items, sec_y)
        
        # y_start = this section's y (slightly before to catch aligned items)
        y_start = sec_y - 2
        
        # y_end = next section's y - 1 (or large number if last)
        if i + 1 < len(sec_items):
            y_end = sec_items[i + 1][1] - 2
        else:
            y_end = 9999
        
        section_entries.append({
            'sec': sec_val,
            'day': day_val,
            'y_start': y_start,
            'y_end': y_end,
            'y': sec_y,
        })
    
    # For each section entry, collect its time/loc/mode/cap rows
    def get_items_in_range(items, y_start, y_end):
        return [val for val, y in items if y_start <= y <= y_end]
    
    # Determine semester for a y position
    def get_semester(y):
        sem = 'SEM1-2025/2026'
        for s, sy in semester_headers:
            if y > sy + 5:
                sem = s
        return sem
    
    # Determine course for a y position
    course_metas.sort(key=lambda c: c['y_pos'])
    
    def get_course(y):
        best = course_metas[0]
        for cm in course_metas:
            if cm['y_pos'] <= y + 20:
                best = cm
            else:
                break
        return best
    
    # Build slots
    all_slots = []
    
    for entry in section_entries:
        if not entry['day']:
            continue
        
        times = get_items_in_range(time_items, entry['y_start'], entry['y_end'])
        locs = get_items_in_range(loc_items, entry['y_start'], entry['y_end'])
        modes = get_items_in_range(mode_items, entry['y_start'], entry['y_end'])
        caps = get_items_in_range(cap_items, entry['y_start'], entry['y_end'])
        
        if not times:
            continue
        
        semester = get_semester(entry['y'])
        course = get_course(entry['y'])
        
        # All time rows in this section share the same day
        for i, time_val in enumerate(times):
            time_match = TIME_RE.match(time_val)
            if not time_match:
                continue
            
            loc_val = locs[i] if i < len(locs) else ''
            mode_val = modes[i] if i < len(modes) else 'L'
            cap_val = caps[i] if i < len(caps) else None
            
            slot_type = MODE_MAP.get(mode_val, 'lecture')
            
            all_slots.append({
                'courseCode': course['code'],
                'courseName': course['name'],
                'section': entry['sec'],
                'type': slot_type,
                'day': entry['day'],
                'startTime': time_match.group(1),
                'endTime': time_match.group(2),
                'venue': loc_val,
                'semester': semester,
                'capacity': cap_val,
            })
    
    # Merge consecutive time slots
    all_slots = merge_consecutive_slots(all_slots)
    
    return all_slots, faculty


def extract_courses(blocks):
    """Extract course metadata from left-side blocks.
    
    Handles two formats:
    1. Combined block: code + name in same multi-line block
    2. Separate blocks: code at x~95 y~108, name at x~95 y~117
    """
    course_metas = []
    
    # Strategy: find ALL code blocks and ALL name blocks, then match them
    # This handles both combined and separate formats uniformly
    
    code_entries = []  # (code, y0)
    name_entries = []  # (name, y0)
    campus_entries = []  # (campus, y0)
    
    for b in blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        text_stripped = text.strip()
        if not text_stripped or x0 > 220:
            continue
        
        lines = text_stripped.split('\n')
        
        # Look in left-side blocks (x0 < 130)
        if x0 < 130:
            campus = None
            for line in lines:
                line = line.strip()
                if line in ('GAMBANG', 'PEKAN'):
                    campus_entries.append((line, y0))
                if COURSE_CODE_RE.match(line):
                    code_entries.append((line, y0))
        
        # Look for name blocks at x~95-220
        # These are blocks that contain the course name (uppercase text)
        # They appear right after the code block (y ~ code_y + 9)
        if 90 <= x0 <= 220:
            first_line = lines[0].strip()
            # Skip if it's a code, label, or known non-name
            if (COURSE_CODE_RE.match(first_line) or
                first_line in ('NO', 'DEGREE', 'DIPLOMA', 'GAMBANG', 'PEKAN') or
                first_line.startswith('Pre-Requisite') or
                first_line.startswith('Remarks') or
                first_line.startswith('DITAWARKAN') or
                first_line.startswith('SUBJECT') or
                first_line.startswith('Campus') or
                first_line.startswith('Level') or
                first_line.startswith('Course Code') or
                first_line.startswith('Course Name') or
                len(first_line) <= 2 or
                not re.match(r'^[A-Z]', first_line) or
                re.match(r'^\d', first_line)):
                continue
            
            # Also skip prerequisite values like "BCS1133,"
            if re.match(r'^[A-Z]{2,4}\d{3,4}[,\s]', first_line):
                continue
            
            full_name = text_stripped.replace('\n', ' ').strip()
            name_entries.append((full_name, y0))
    
    # Also check combined blocks where code AND name are in same block
    for b in blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        text_stripped = text.strip()
        if not text_stripped or x0 > 200:
            continue
        
        lines = text_stripped.split('\n')
        
        if x0 < 100 and len(lines) >= 2:
            for i, line in enumerate(lines):
                line = line.strip()
                if COURSE_CODE_RE.match(line):
                    # Check if already found
                    already = any(c == line and abs(cy - y0) < 5 for c, cy in code_entries)
                    if not already:
                        code_entries.append((line, y0))
                    # Next lines might be the name
                    name_parts = []
                    for j in range(i + 1, len(lines)):
                        nl = lines[j].strip()
                        if (COURSE_CODE_RE.match(nl) or
                            nl.startswith('Pre-Requisite') or
                            nl in ('NO', 'GAMBANG', 'PEKAN', 'DEGREE', 'DIPLOMA', '') or
                            nl.startswith('Remarks') or
                            nl.startswith('Campus') or
                            nl.startswith('Level') or
                            nl.startswith('Course') or
                            nl.startswith('DITAWARKAN') or
                            nl.startswith('SUBJECT')):
                            break
                        name_parts.append(nl)
                    if name_parts:
                        combined_name = ' '.join(name_parts).strip()
                        # Add as name entry at code's y + small offset
                        name_entries.append((combined_name, y0 + 9))
    
    # Deduplicate code entries
    seen_codes = set()
    unique_codes = []
    for code, cy in sorted(code_entries, key=lambda x: x[1]):
        key = (code, round(cy / 50))  # group by approximate position
        if key not in seen_codes:
            seen_codes.add(key)
            unique_codes.append((code, cy))
    
    # Match each code with its name (name y should be 5-18px below code y)
    for code, code_y in unique_codes:
        best_name = ''
        best_dist = 25
        for name, name_y in name_entries:
            dist = name_y - code_y
            if 3 <= dist <= 20 and dist < best_dist:
                best_name = name
                best_dist = dist
        
        # Find campus (closest campus entry within 30px)
        campus = 'PEKAN'
        for c, cy in campus_entries:
            if abs(cy - code_y) < 30:
                campus = c
                break
        
        course_metas.append({
            'code': code,
            'name': best_name,
            'campus': campus,
            'y_pos': code_y
        })
    
    return course_metas


def merge_consecutive_slots(slots):
    """Merge consecutive 50-min slots into combined slots."""
    if not slots:
        return []
    
    slots.sort(key=lambda s: (s['courseCode'], s['section'], s['semester'], s['day'], s['startTime']))
    
    merged = [slots[0].copy()]
    
    for i in range(1, len(slots)):
        prev = merged[-1]
        curr = slots[i]
        
        if (prev['courseCode'] == curr['courseCode'] and
            prev['section'] == curr['section'] and
            prev['semester'] == curr['semester'] and
            prev['day'] == curr['day'] and
            prev['type'] == curr['type'] and
            is_consecutive(prev['endTime'], curr['startTime'])):
            prev['endTime'] = curr['endTime']
            if curr['capacity'] and (not prev['capacity'] or curr['capacity'] > prev['capacity']):
                prev['capacity'] = curr['capacity']
        else:
            merged.append(curr.copy())
    
    return merged


def is_consecutive(end_time, start_time):
    eh, em = map(int, end_time.split(':'))
    sh, sm = map(int, start_time.split(':'))
    return 0 <= (sh * 60 + sm) - (eh * 60 + em) <= 10


def deduplicate_slots(slots):
    """Remove slots that are subsets of longer merged slots.
    
    If we have both 08:00-08:50 and 08:00-09:50 for the same
    course/section/semester/day/type, keep only the longer one.
    """
    # Group by key
    from collections import defaultdict
    groups = defaultdict(list)
    for s in slots:
        key = (s['courseCode'], s['section'], s['semester'], s['day'], s['type'])
        groups[key].append(s)
    
    result = []
    for key, group in groups.items():
        if len(group) == 1:
            result.append(group[0])
            continue
        
        # Sort by start time, then by duration (longest first)
        group.sort(key=lambda s: (s['startTime'], s['startTime'] == s['endTime']))
        
        # Keep only slots that aren't contained within another slot
        kept = []
        for s in group:
            s_start = int(s['startTime'].replace(':', ''))
            s_end = int(s['endTime'].replace(':', ''))
            
            is_subset = False
            for k in kept:
                k_start = int(k['startTime'].replace(':', ''))
                k_end = int(k['endTime'].replace(':', ''))
                # s is a subset of k if k_start <= s_start and s_end <= k_end
                if k_start <= s_start and s_end <= k_end and (k_start != s_start or k_end != s_end):
                    is_subset = True
                    break
            
            if not is_subset:
                # Also check if this slot contains any already-kept slot
                # If so, remove the smaller one
                new_kept = []
                for k in kept:
                    k_start = int(k['startTime'].replace(':', ''))
                    k_end = int(k['endTime'].replace(':', ''))
                    if s_start <= k_start and k_end <= s_end and (s_start != k_start or s_end != k_end):
                        pass  # k is subset of s, drop it
                    else:
                        new_kept.append(k)
                new_kept.append(s)
                kept = new_kept
        
        result.extend(kept)
    
    return result


def parse_catalog():
    """Main entry."""
    doc = fitz.open(PDF_PATH)
    all_slots = []
    failed_pages = []
    
    print(f"Total pages: {doc.page_count}")
    print("Parsing...")
    
    for page_num in range(doc.page_count):
        page = doc[page_num]
        try:
            slots, faculty = parse_page(page, page_num)
            if slots:
                all_slots.extend(slots)
                if page_num % 100 == 0 and page_num > 0:
                    print(f"  Page {page_num + 1}: total so far {len(all_slots)}")
        except Exception as e:
            failed_pages.append((page_num + 1, str(e)))
    
    doc.close()
    
    # Global merge: merge consecutive slots that span across pages
    all_slots = merge_consecutive_slots(all_slots)
    
    # Deduplicate: remove slots that are subsets of longer merged slots
    # If 08:00-09:50 exists, remove 08:00-08:50 and 09:00-09:50 for same key
    all_slots = deduplicate_slots(all_slots)
    
    # Post-process: fill empty names from other slots
    name_lookup = {}
    for s in all_slots:
        if s['courseName'] and len(s['courseName']) > 3:
            code = s['courseCode']
            if code not in name_lookup or len(s['courseName']) > len(name_lookup[code]):
                name_lookup[code] = s['courseName']
    
    empty_before = sum(1 for s in all_slots if not s['courseName'])
    for s in all_slots:
        if (not s['courseName'] or len(s['courseName']) <= 3) and s['courseCode'] in name_lookup:
            s['courseName'] = name_lookup[s['courseCode']]
    empty_after = sum(1 for s in all_slots if not s['courseName'])
    
    # Stats
    print(f"\n{'='*50}")
    print(f"Total slots: {len(all_slots)}")
    print(f"Unique courses: {len(set(s['courseCode'] for s in all_slots))}")
    print(f"Failed pages: {len(failed_pages)}")
    print(f"Empty names: {empty_before} -> {empty_after}")
    
    type_counts = Counter(s['type'] for s in all_slots)
    sem_counts = Counter(s['semester'] for s in all_slots)
    print(f"Types: {dict(type_counts)}")
    print(f"Semesters: {dict(sem_counts)}")
    
    durations = Counter()
    for s in all_slots:
        sh, sm = map(int, s['startTime'].split(':'))
        eh, em = map(int, s['endTime'].split(':'))
        d = (eh * 60 + em) - (sh * 60 + sm)
        durations[d] += 1
    print(f"Durations (min): {dict(sorted(durations.items()))}")
    
    with_cap = sum(1 for s in all_slots if s['capacity'])
    print(f"Slots with capacity: {with_cap}/{len(all_slots)}")
    
    if failed_pages:
        print(f"\nFailed pages ({len(failed_pages)}):")
        for pn, err in failed_pages[:10]:
            print(f"  Page {pn}: {err}")
    
    # Sample BCS2313
    print(f"\nBCS2313:")
    for s in all_slots:
        if s['courseCode'] == 'BCS2313':
            print(f"  {s['section']} | {s['type']} | {s['day']} {s['startTime']}-{s['endTime']} | {s['venue']} | {s['semester']} | cap={s['capacity']}")
    
    # Save
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_slots, f, indent=2, ensure_ascii=False)
    print(f"\nSaved to: {OUTPUT_PATH}")


if __name__ == '__main__':
    parse_catalog()
