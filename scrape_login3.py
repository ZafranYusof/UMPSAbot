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

try:
    driver.get('https://std-comm.ump.edu.my/')
    time.sleep(5)
    print(f'URL: {driver.current_url}')
    
    # Fill credentials
    visible_user = [u for u in driver.find_elements(By.NAME, 'userName') if u.is_displayed()][0]
    visible_pass = [p for p in driver.find_elements(By.NAME, 'password') if p.is_displayed()][0]
    
    visible_user.clear()
    visible_user.send_keys('CB23109')
    visible_pass.clear()
    visible_pass.send_keys('Hmremix123456789%')
    
    # Need to select "Student" radio/option first
    # Check for any select or radio for user type
    selects = driver.find_elements(By.TAG_NAME, 'select')
    radios = driver.find_elements(By.CSS_SELECTOR, 'input[type=radio]')
    print(f'Selects: {len(selects)}')
    print(f'Radios: {len(radios)}')
    
    for s in selects:
        if s.is_displayed():
            name = s.get_attribute('name')
            opts = s.find_elements(By.TAG_NAME, 'option')
            print(f'  Select name={name}:')
            for o in opts:
                print(f'    option: value={o.get_attribute("value")} text={o.text}')
    
    # Look for Student option and select it
    for s in selects:
        if s.is_displayed():
            opts = s.find_elements(By.TAG_NAME, 'option')
            for o in opts:
                if 'student' in o.text.lower() or 'student' in (o.get_attribute('value') or '').lower():
                    o.click()
                    print(f'Selected: {o.text}')
                    break
    
    time.sleep(1)
    
    # Click the Login button with submitform()
    driver.execute_script('return submitform()')
    time.sleep(5)
    
    print(f'\nAfter login:')
    print(f'URL: {driver.current_url}')
    print(f'Title: {driver.title}')
    
    body = driver.find_element(By.TAG_NAME, 'body')
    text = body.text[:5000]
    print(f'\nBody text:\n{text}')

finally:
    driver.quit()
