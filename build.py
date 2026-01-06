from flask_frozen import Freezer
from app import app
import shutil
import os

# Configure Freezer
app.config['FREEZER_DESTINATION'] = 'build'
app.config['FREEZER_RELATIVE_URLS'] = True

freezer = Freezer(app)

if __name__ == '__main__':
    print("Building static site...")
    freezer.freeze()
    
    # Post-processing: Make sure CNAME or other static files are copied if needed
    # Note: Flask-Frozen usually copies 'static' folder automatically
    
    # Copy data files to build directory so fetch() works if needed
    for filename in ['links.json', 'notice.txt']:
        if os.path.exists(filename):
            shutil.copy(filename, os.path.join(app.config['FREEZER_DESTINATION'], filename))
            print(f"Copied {filename} to build directory.")
    
    # Create .nojekyll to disable GitHub Pages Jekyll processing
    with open(os.path.join(app.config['FREEZER_DESTINATION'], '.nojekyll'), 'w') as f:
        f.write('')
    
    print("Build complete. Output in 'build/' directory.")
