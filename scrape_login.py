import sys, time, json
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
options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
driver.set_page_load_timeout(30)

try:
    # Go to login page
    driver.get('https://std-comm.ump.edu.my/')
    time.sleep(3)
    print(f'Login page: {driver.current_url}')
    print(f'Title: {driver.title}')
    
    # Fill login form
    username_field = driver.find_element(By.NAME, 'userName')
    password_field = driver.find_element(By.NAME, 'password')
    
    username_field.clear()
    username_field.send_keys('CB23109')
    password_field.clear()
    password_field.send_keys('Hmremix123456789%')
    
    # Find and click login button
    buttons = driver.find_elements(By.TAG_NAME, 'input')
    for btn in buttons:
        if btn.get_attribute('type') == 'button':
            onclick = btn.get_attribute('onclick') or ''
            value = btn.get_attribute('value') or ''
            print(f'  Button: value={value} onclick={onclick[:100]}')
    
    # Try submitting the form
    forms = driver.find_elements(By.TAG_NAME, 'form')
    print(f'Forms found: {len(forms)}')
    for i, form in enumerate(forms):
        action = form.get_attribute('action') or ''
        method = form.get_attribute('method') or ''
        print(f'  Form {i}: action={action} method={method}')
    
    # Click first button (login)
    login_btns = [b for b in buttons if b.get_attribute('type') == 'button']
    if login_btns:
        login_btns[0].click()
        time.sleep(5)
        print(f'\nAfter login:')
        print(f'URL: {driver.current_url}')
        print(f'Title: {driver.title}')
        print(f'Page length: {len(driver.page_source)}')
        
        # Get page text
        body = driver.find_element(By.TAG_NAME, 'body')
        text = body.text[:5000]
        print(f'\nBody text:\n{text}')
    
finally:
    driver.quit()
