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
    print(f'Title: {driver.title}')
    
    # Find all username and password fields, check which are visible
    usernames = driver.find_elements(By.NAME, 'userName')
    passwords = driver.find_elements(By.NAME, 'password')
    print(f'Username fields: {len(usernames)}')
    print(f'Password fields: {len(passwords)}')
    
    for i, u in enumerate(usernames):
        displayed = u.is_displayed()
        enabled = u.is_enabled()
        print(f'  username[{i}]: displayed={displayed} enabled={enabled}')
    
    for i, p in enumerate(passwords):
        displayed = p.is_displayed()
        enabled = p.is_enabled()
        print(f'  password[{i}]: displayed={displayed} enabled={enabled}')
    
    # Use the visible ones
    visible_user = [u for u in usernames if u.is_displayed()]
    visible_pass = [p for p in passwords if p.is_displayed()]
    
    if visible_user and visible_pass:
        visible_user[0].clear()
        visible_user[0].send_keys('CB23109')
        visible_pass[0].clear()
        visible_pass[0].send_keys('Hmremix123456789%')
        print('Filled credentials')
        
        # Find visible submit button
        all_inputs = driver.find_elements(By.CSS_SELECTOR, 'input[type=button], input[type=submit], button')
        for btn in all_inputs:
            if btn.is_displayed():
                val = btn.get_attribute('value') or btn.text
                onclick = btn.get_attribute('onclick') or ''
                print(f'  Visible button: val={val} onclick={onclick[:80]}')
        
        # Try JavaScript submit
        driver.execute_script("document.forms[0].submit()")
        time.sleep(5)
        
        print(f'\nAfter login:')
        print(f'URL: {driver.current_url}')
        print(f'Title: {driver.title}')
        
        body = driver.find_element(By.TAG_NAME, 'body')
        text = body.text[:5000]
        print(f'\nBody text:\n{text}')
    else:
        print('No visible login fields found')
        # Dump page source for debugging
        print(driver.page_source[:3000])

finally:
    driver.quit()
