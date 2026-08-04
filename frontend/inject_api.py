import glob

for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        content = file.read()
    
    if 'api.js' not in content:
        content = content.replace('<script src="assets/js/main.js"></script>', '<script src="assets/js/api.js"></script>\n  <script src="assets/js/main.js"></script>')
        
        with open(f, 'w') as file:
            file.write(content)
            print(f"Updated {f}")
