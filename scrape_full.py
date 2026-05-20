import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

options = Options()
options.add_argument('--headless=new')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--window-size=1920,1080')
options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
driver.set_page_load_timeout(30)

def login():
    driver.get('https://std-comm.ump.edu.my/')
    time.sleep(5)
    visible_user = [u for u in driver.find_elements(By.NAME, 'userName') if u.is_displayed()][0]
    visible_pass = [p for p in driver.find_elements(By.NAME, 'password') if p.is_displayed()][0]
    visible_user.clear()
    visible_user.send_keys('CB23109')
    visible_pass.clear()
    visible_pass.send_keys('Hmremix123456789%')
    # Select Student
    for s in driver.find_elements(By.TAG_NAME, 'select'):
        if s.is_displayed():
            for o in s.find_elements(By.TAG_NAME, 'option'):
                if 'student' in o.text.lower():
                    o.click()
                    break
    time.sleep(1)
    driver.execute_script('return submitform()')
    time.sleep(5)
    print(f'Logged in: {driver.current_url}')

def scrape_page(url, name):
    try:
        driver.get(url)
        time.sleep(3)
        body = driver.find_element(By.TAG_NAME, 'body')
        text = body.text
        print(f'\n{"="*60}')
        print(f'PAGE: {name}')
        print(f'URL: {driver.current_url}')
        print(f'Length: {len(text)} chars')
        print(f'{"="*60}')
        # Save to file
        filename = name.replace(' ', '_').lower()
        with open(f'docs/ecomm_{filename}.txt', 'w', encoding='utf-8') as f:
            f.write(f'# {name}\n')
            f.write(f'# Source: {url}\n\n')
            f.write(text)
        print(f'Saved to docs/ecomm_{filename}.txt')
        return text
    except Exception as e:
        print(f'Error scraping {name}: {e}')
        return ''

try:
    login()
    
    base = 'https://std-comm.ump.edu.my/ecommstudent'
    
    # Scrape key pages
    pages = [
        (f'{base}/home.jsp', 'Home Menu'),
        (f'{base}/courseStructure.jsp', 'Course Structure'),
        (f'{base}/courseResult.jsp', 'Course Results'),
        (f'{base}/studentLedger.jsp', 'Student Ledger Fees'),
        (f'{base}/timetable.jsp', 'Timetable'),
        (f'{base}/examSchedule.jsp', 'Exam Schedule'),
        (f'{base}/courseRegistration.jsp', 'Course Registration'),
    ]
    
    for url, name in pages:
        scrape_page(url, name)
        time.sleep(2)

finally:
    driver.quit()
    print('\nDone!')
