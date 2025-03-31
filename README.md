# 英语句子学习应用

一个简单而实用的英语句子学习Web应用，帮助用户通过听、说、读、写的方式学习英语句子。

## 功能特点

1. **导入英语句子**：用户可以导入自己喜欢的英语句子，比如喜欢的英文歌曲、电影台词等。
2. **查看句子**：选择句子集后，可以浏览所有句子的英文和中文翻译。
3. **播放语音**：每个句子都配有英文语音，可以随时播放。
4. **跟写练习**：提供跟写功能，显示中文让用户输入对应的英文，并给出即时反馈。
5. **学习进度**：练习模式下会显示学习进度和正确率。
6. **即时单词提示**：在输入过程中即时显示每个单词是否正确，提高学习效率。

## 安装步骤

### 1. 环境准备

#### 使用conda创建虚拟环境（推荐）
```bash
conda create -n english_study python=3.8
conda activate english_study 
```

#### 使用pip创建虚拟环境
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 2. 安装依赖

#### 使用默认pip源
```bash
pip install -r requirements.txt
```

#### 使用国内镜像源（推荐）
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

常用国内镜像源：
- 清华大学：https://pypi.tuna.tsinghua.edu.cn/simple
- 阿里云：http://mirrors.aliyun.com/pypi/simple/
- 豆瓣：http://pypi.douban.com/simple/

### 3. 网络需求

**注意**：语音合成功能（英语朗读）需要连接互联网，因为应用使用Google Text-to-Speech (gTTS)服务生成语音。如果无法连接互联网，语音播放功能将无法使用，但其他功能可以正常工作。

### 4. 运行应用
```bash
python run.py
```

### 5. 访问应用
浏览器会自动打开 `http://127.0.0.1:5000/`

## 使用方法

### 添加新句子集

1. 在首页点击"添加新句子集"部分
2. 输入句子集的标题
3. 在内容框中按照格式输入英文句子和对应的中文翻译（每行英文句子后换行添加中文翻译）
4. 点击"添加"按钮保存

### 查看句子

1. 在首页的句子集列表中点击"查看"按钮
2. 页面将显示该句子集的所有句子（英文和中文）
3. 点击"播放"按钮可以听到对应句子的英文发音

### 练习模式

1. 在首页的句子集列表中点击"练习"按钮
2. 页面将显示中文，要求输入对应的英文
3. 输入时会实时显示每个单词是否正确（绿色表示正确，红色表示错误）
4. 可以点击"播放"按钮听发音，或点击"显示答案"查看正确答案
5. 输入完成后点击"检查"按钮或按回车键检查整句正确性
6. 系统会给出即时反馈，显示每个单词的正确与否
7. 点击"下一个"继续练习
8. 完成所有句子后会显示练习总结

## 技术栈

- 后端：Python Flask
- 前端：HTML, CSS, JavaScript
- 语音合成：gTTS (Google Text-to-Speech)

## 许可证

MIT 