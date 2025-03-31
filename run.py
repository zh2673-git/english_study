from app import create_app
import webbrowser
import threading
import time

app = create_app()

def open_browser():
    """在应用启动后打开浏览器"""
    time.sleep(1)
    webbrowser.open('http://127.0.0.1:5000/')

if __name__ == '__main__':
    # 在新线程中打开浏览器
    threading.Thread(target=open_browser).start()
    
    # 启动Flask应用
    app.run(debug=True) 