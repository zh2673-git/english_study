from flask import Blueprint, render_template, request, jsonify, redirect, url_for, send_from_directory, session
import os
import json
# from gtts import gTTS  # 注释掉谷歌TTS
# import pyttsx3  # 使用本地语音合成
import re
import uuid
import logging
import threading
import shutil  # 用于文件操作

main = Blueprint('main', __name__)

DATA_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
AUDIO_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/audio')
HISTORY_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data/history')
CATEGORIES_FILE = os.path.join(DATA_FOLDER, 'categories.json')

# 确保历史记录目录存在
if not os.path.exists(HISTORY_FOLDER):
    os.makedirs(HISTORY_FOLDER)

# 确保数据目录存在
if not os.path.exists(DATA_FOLDER):
    os.makedirs(DATA_FOLDER)

# 预制音频文件夹，包含常用单词的音频
PRESET_AUDIO_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/preset_audio')

# 初始化语音引擎
engine = None
engine_lock = threading.Lock()

# 注释掉pyttsx3相关代码
# def get_tts_engine():
#     global engine
#     with engine_lock:
#         if engine is None:
#             engine = pyttsx3.init()
#             # 设置语速
#             engine.setProperty('rate', 150)
#             # 设置音量
#             engine.setProperty('volume', 1.0)
#             # 尝试设置为英语声音（如果可用）
#             voices = engine.getProperty('voices')
#             for voice in voices:
#                 if 'english' in voice.name.lower():
#                     engine.setProperty('voice', voice.id)
#                     break
#     return engine

def normalize_sentence(sentence):
    """标准化句子以便比较"""
    return re.sub(r'[^\w\s]', '', sentence.lower().strip())

def get_sentences_files():
    """获取所有句子集文件"""
    if not os.path.exists(DATA_FOLDER):
        os.makedirs(DATA_FOLDER)
    files = [f for f in os.listdir(DATA_FOLDER) if f.endswith('.json')]
    return files

def get_sentences(file_name):
    """从文件中获取句子集"""
    file_path = os.path.join(DATA_FOLDER, file_name)
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

# 加载或创建分类数据
def get_categories():
    if os.path.exists(CATEGORIES_FILE):
        with open(CATEGORIES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    # 默认分类
    categories = {
        "default": {
            "name": "默认",
            "files": []
        }
    }
    # 保存默认分类
    with open(CATEGORIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(categories, f, ensure_ascii=False, indent=2)
    return categories

# 保存分类数据
def save_categories(categories):
    with open(CATEGORIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(categories, f, ensure_ascii=False, indent=2)

@main.route('/')
def index():
    files = get_sentences_files()
    categories = get_categories()
    return render_template('index.html', files=files, categories=categories)

@main.route('/sentences/<file_name>')
def sentences(file_name):
    sentences = get_sentences(file_name)
    return render_template('sentences.html', sentences=sentences, file_name=file_name)

@main.route('/practice/<file_name>')
def practice(file_name):
    sentences = get_sentences(file_name)
    
    # 获取历史记录，如果有的话
    history = get_history(file_name)
    
    return render_template('practice.html', sentences=sentences, file_name=file_name, history=history)

@main.route('/upload', methods=['POST'])
def upload():
    title = request.form.get('title', '未命名')
    content = request.form.get('content', '')
    category_id = request.form.get('category', 'default')  # 默认分类ID
    
    # 解析内容到英文和中文句子对
    lines = content.strip().split('\n')
    sentences = []
    
    # 使用与编辑功能相同的解析逻辑
    i = 0
    while i < len(lines):
        english = lines[i].strip()
        i += 1
        
        # 确保还有下一行作为中文
        if i < len(lines):
            chinese = lines[i].strip()
            i += 1
            
            # 只有两行都有内容时才添加
            if english and chinese:
                sentences.append({
                    "english": english,
                    "chinese": chinese,
                    "id": str(uuid.uuid4())
                })
    
    # 处理文件名，移除特殊字符
    safe_title = re.sub(r'[\\/*?:"<>|]', '_', title)  # 替换Windows不允许的字符
    file_name = f"{safe_title.replace(' ', '_')}.json"
    file_path = os.path.join(DATA_FOLDER, file_name)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(sentences, f, ensure_ascii=False, indent=2)
    
    # 将文件添加到所选分类
    try:
        categories = get_categories()
        if category_id in categories:
            # 确保文件不在其他分类中
            for cat_id, category in categories.items():
                if file_name in category["files"]:
                    category["files"].remove(file_name)
            
            # 添加到指定分类
            if file_name not in categories[category_id]["files"]:
                categories[category_id]["files"].append(file_name)
                
            # 保存分类数据
            save_categories(categories)
    except Exception as e:
        logging.error(f"分类保存错误: {str(e)}")
    
    return redirect(url_for('main.index'))

@main.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.get_json()
    text = data.get('text', '')
    sentence_id = data.get('id', '')
    
    if not text or not sentence_id:
        return jsonify({"error": "Missing text or id"}), 400
    
    try:
        # 返回前端合成指令，让浏览器使用Web Speech API合成语音
        return jsonify({
            "use_browser_tts": True,
            "text": text,
            "id": sentence_id
        })
            
    except Exception as e:
        logging.error(f"TTS错误: {str(e)}")
        # 无法生成语音时返回错误信息
        return jsonify({"error": f"无法生成语音: {str(e)}"}), 500

@main.route('/check', methods=['POST'])
def check_answer():
    data = request.get_json()
    user_answer = data.get('answer', '').strip()
    correct_answer = data.get('correct', '').strip()
    file_name = data.get('file_name', '')  # 添加文件名参数
    sentence_index = data.get('sentence_index', 0)  # 添加句子索引参数
    
    # 分词处理，用于逐词比较
    correct_words = correct_answer.split()
    user_words = user_answer.split()
    
    # 标准化答案以进行整句比较
    normalized_user = normalize_sentence(user_answer)
    normalized_correct = normalize_sentence(correct_answer)
    
    is_correct = normalized_user == normalized_correct
    
    # 更新历史记录
    if file_name:
        update_history(file_name, sentence_index, is_correct)
    
    # 词级别比较
    word_results = []
    max_length = max(len(correct_words), len(user_words))
    
    for i in range(max_length):
        if i < len(user_words) and i < len(correct_words):
            word_correct = normalize_sentence(user_words[i]) == normalize_sentence(correct_words[i])
            word_results.append({
                "word": user_words[i],
                "correct": word_correct,
                "expected": correct_words[i] if not word_correct else None
            })
        elif i < len(correct_words):
            # 用户缺少单词
            word_results.append({
                "word": "",
                "correct": False,
                "expected": correct_words[i]
            })
        else:
            # 用户多输入了单词
            word_results.append({
                "word": user_words[i],
                "correct": False,
                "expected": None
            })
    
    return jsonify({
        "correct": is_correct,
        "word_results": word_results,
        "correct_answer": correct_answer
    })

@main.route('/save_progress', methods=['POST'])
def save_progress():
    """保存练习进度"""
    data = request.get_json()
    file_name = data.get('file_name')
    current_index = data.get('current_index', 0)
    correct = data.get('correct', 0)
    wrong = data.get('wrong', 0)
    
    if not file_name:
        return jsonify({"error": "缺少文件名"}), 400
    
    try:
        update_history(file_name, current_index, None, {"correct": correct, "wrong": wrong})
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_history(file_name):
    """获取历史记录"""
    # 确保文件名安全，保留原扩展名
    base_name = os.path.splitext(file_name)[0]
    safe_base_name = re.sub(r'[\\/*?:"<>|]', '_', base_name)
    history_file = os.path.join(HISTORY_FOLDER, f"{safe_base_name}_history.json")
    if os.path.exists(history_file):
        with open(history_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"current_index": 0, "results": {}, "stats": {"correct": 0, "wrong": 0}}

def update_history(file_name, sentence_index, is_correct, stats=None):
    """更新历史记录"""
    # 确保文件名安全，保留原扩展名
    base_name = os.path.splitext(file_name)[0]
    safe_base_name = re.sub(r'[\\/*?:"<>|]', '_', base_name)
    history_file = os.path.join(HISTORY_FOLDER, f"{safe_base_name}_history.json")
    
    # 读取现有历史记录或创建新记录
    if os.path.exists(history_file):
        with open(history_file, 'r', encoding='utf-8') as f:
            history = json.load(f)
    else:
        history = {"current_index": 0, "results": {}, "stats": {"correct": 0, "wrong": 0}}
    
    # 更新当前索引
    history["current_index"] = sentence_index
    
    # 更新正确/错误状态
    if is_correct is not None:
        str_index = str(sentence_index)
        if str_index not in history["results"]:
            history["results"][str_index] = {"attempts": 0, "correct": 0}
        
        history["results"][str_index]["attempts"] += 1
        if is_correct:
            history["results"][str_index]["correct"] += 1
    
    # 更新统计信息
    if stats:
        history["stats"] = stats
    
    # 保存更新后的历史记录
    with open(history_file, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    
    return history

@main.route('/delete/<file_name>', methods=['POST'])
def delete_sentence_file(file_name):
    """删除句子集文件"""
    file_path = os.path.join(DATA_FOLDER, file_name)
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        return jsonify({"error": "文件不存在"}), 404
    
    try:
        # 删除文件
        os.remove(file_path)
        
        # 删除历史记录
        history_file = os.path.join(HISTORY_FOLDER, f"{os.path.splitext(file_name)[0]}_history.json")
        if os.path.exists(history_file):
            os.remove(history_file)
        
        # 从分类中移除
        categories = get_categories()
        for category in categories.values():
            if file_name in category["files"]:
                category["files"].remove(file_name)
        save_categories(categories)
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route('/edit/<file_name>', methods=['GET', 'POST'])
def edit_sentence_file(file_name):
    """编辑句子集"""
    file_path = os.path.join(DATA_FOLDER, file_name)
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        return redirect(url_for('main.index'))
    
    if request.method == 'GET':
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            sentences = json.load(f)
        
        # 转换为可编辑的文本格式
        content = ""
        for sentence in sentences:
            content += sentence['english'] + "\n" + sentence['chinese'] + "\n"
        
        return render_template('edit.html', file_name=file_name, content=content)
    else:
        # 处理更新请求
        content = request.form.get('content', '')
        lines = content.strip().split('\n')
        sentences = []
        
        # 修改：更精确的解析逻辑
        i = 0
        while i < len(lines):
            english = lines[i].strip()
            i += 1
            
            # 确保还有下一行作为中文
            if i < len(lines):
                chinese = lines[i].strip()
                i += 1
                
                # 只有两行都有内容时才添加
                if english and chinese:
                    sentences.append({
                        "english": english,
                        "chinese": chinese,
                        "id": str(uuid.uuid4())
                    })
        
        # 保存更新后的句子集
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sentences, f, ensure_ascii=False, indent=2)
        
        return redirect(url_for('main.sentences', file_name=file_name))

@main.route('/categories', methods=['GET', 'POST'])
def manage_categories():
    """管理分类"""
    if request.method == 'GET':
        categories = get_categories()
        files = get_sentences_files()
        return render_template('categories.html', categories=categories, files=files)
    else:
        action = request.form.get('action')
        
        if action == 'add':
            # 添加新分类
            category_id = request.form.get('id', str(uuid.uuid4()))
            category_name = request.form.get('name', '新分类')
            
            categories = get_categories()
            categories[category_id] = {
                "name": category_name,
                "files": []
            }
            save_categories(categories)
            
        elif action == 'delete':
            # 删除分类
            category_id = request.form.get('id')
            categories = get_categories()
            
            if category_id in categories and category_id != 'default':
                # 将分类中的文件移至默认分类
                for file_name in categories[category_id]["files"]:
                    if file_name not in categories["default"]["files"]:
                        categories["default"]["files"].append(file_name)
                
                # 删除分类
                del categories[category_id]
                save_categories(categories)
        
        elif action == 'update':
            # 更新文件所属分类
            file_name = request.form.get('file_name')
            category_id = request.form.get('category_id')
            
            categories = get_categories()
            
            # 从所有分类中移除该文件
            for cat_id, category in categories.items():
                if file_name in category["files"]:
                    category["files"].remove(file_name)
            
            # 添加到新分类
            if category_id in categories:
                if file_name not in categories[category_id]["files"]:
                    categories[category_id]["files"].append(file_name)
                
            # 保存更新后的分类
            save_categories(categories)
        
        return redirect(url_for('main.manage_categories')) 