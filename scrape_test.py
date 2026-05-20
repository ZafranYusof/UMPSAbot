import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

options = Options()
options.add_argument('--headless=new')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
driver.set_page_load_timeout(30)

try:
    urls = [
        'https://std-comm.ump.edu.my/ecommstudent/home.jsp',
        'https://std-comm.ump.edu.my/ecommstudent/',
        'https://std-comm.ump.edu.my/',
    ]
    for url in urls:
        try:
            driver.get(url)
            time.sleep(2)
            print(f'URL: {url}')
            print(f'  Final: {driver.current_url}')
            print(f'  Title: {driver.title}')
            src = driver.page_source
            print(f'  Length: {len(src)}')
            forms = driver.find_elements(By.TAG_NAME, 'form')
            print(f'  Forms: {len(forms)}')
            inputs = driver.find_elements(By.TAG_NAME, 'input')
            for inp in inputs:
                n = inp.get_attribute('name')
                t = inp.get_attribute('type')
                print(f'    input: name={n} type={t}')
            print()
        except Exception as e:
            print(f'URL: {url} -> Error: {e}')
            print()
finally:
    driver.quit()
