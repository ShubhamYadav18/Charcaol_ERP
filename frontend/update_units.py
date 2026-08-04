import os

def replace_in_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # JavaScript Files Replacements
    if path.endswith('.js'):
        if ' MT`' in content:
            content = content.replace(' MT`', ' ${window.getWeightUnit()}`')
            modified = True
        if ' MT<' in content:
            content = content.replace(' MT<', ' ${window.getWeightUnit()}<')
            modified = True
        if '₹${' in content:
            content = content.replace('₹${', '${window.getCurrencySymbol()}${')
            modified = True
        if '`₹' in content: # cases like `₹0`
            content = content.replace('`₹', '`${window.getCurrencySymbol()}')
            modified = True
            
    # HTML Files Replacements
    if path.endswith('.html'):
        if ' (MT)' in content:
            content = content.replace(' (MT)', ' (<span class="dyn-wt-unit">MT</span>)')
            modified = True
        if '₹' in content:
            # specifically for static ₹0
            content = content.replace('₹0', '<span class="dyn-curr-symbol">₹</span>0')
            content = content.replace('Rate (₹)', 'Rate (<span class="dyn-curr-symbol">₹</span>)')
            content = content.replace('Amount (₹)', 'Amount (<span class="dyn-curr-symbol">₹</span>)')
            modified = True
            
    if modified:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")

def main():
    base_dir = 'c:/Users/CHRW/Desktop/Charcoal/charcoal-erp/frontend'
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.js') or file.endswith('.html'):
                replace_in_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
