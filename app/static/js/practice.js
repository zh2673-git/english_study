document.addEventListener('DOMContentLoaded', function() {
    // 初始化语音合成
    let voices = [];
    function initVoices() {
        voices = window.speechSynthesis.getVoices();
        console.log('可用语音:', voices);
    }
    
    if ('speechSynthesis' in window) {
        // Chrome需要在onvoiceschanged事件触发后获取
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = initVoices;
        }
        // 初始化获取
        initVoices();
    }
    
    // 获取文件名
    const fileName = document.querySelector('.practice-view').dataset.fileName;
    
    // 时间设置相关变量
    let timerInterval = null;
    let remainingSeconds = 0;
    let timerActive = false;
    
    // 获取时间设置相关元素
    const timeSelector = document.getElementById('practice-time');
    const startTimerBtn = document.querySelector('.start-timer-btn');
    const timerDisplay = document.querySelector('.timer-display');
    const remainingTimeElement = document.querySelector('.remaining-time');
    
    // 设置倒计时
    function startTimer(minutes) {
        // 清除之前的计时器
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // 如果选择了"不限时"，则不启动计时器
        if (minutes <= 0) {
            timerDisplay.classList.add('hidden');
            timerActive = false;
            return;
        }
        
        // 计算总秒数并显示
        remainingSeconds = minutes * 60;
        updateTimerDisplay();
        timerDisplay.classList.remove('hidden');
        timerActive = true;
        
        // 启动计时器
        timerInterval = setInterval(function() {
            remainingSeconds--;
            
            // 根据剩余时间更新显示样式
            if (remainingSeconds <= 60) {
                timerDisplay.classList.add('danger');
            } else if (remainingSeconds <= 180) {
                timerDisplay.classList.add('warning');
                timerDisplay.classList.remove('danger');
            } else {
                timerDisplay.classList.remove('warning', 'danger');
            }
            
            updateTimerDisplay();
            
            // 时间到，显示提示但不跳转
            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                timerActive = false;
                timerDisplay.textContent = '时间已结束';
                timerDisplay.classList.add('danger');
                alert('练习时间已结束! 你可以继续完成当前练习。');
            }
        }, 1000);
    }
    
    // 更新时间显示
    function updateTimerDisplay() {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        remainingTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 添加开始计时按钮事件
    startTimerBtn.addEventListener('click', function() {
        const selectedMinutes = parseInt(timeSelector.value);
        startTimer(selectedMinutes);
        this.textContent = '重新计时';
    });
    
    // 获取练习容器和句子数据
    const practiceContainer = document.querySelector('.practice-container');
    if (!practiceContainer) {
        console.error('找不到练习容器');
        alert('页面加载错误: 找不到练习容器');
        return;
    }
    
    // 增强JSON解析和错误处理
    let sentencesData;
    let historyData;
    try {
        const rawData = practiceContainer.getAttribute('data-sentences');
        const rawHistory = practiceContainer.getAttribute('data-history');
        console.log('原始数据:', rawData);
        
        if (!rawData) {
            throw new Error('data-sentences属性为空');
        }
        
        sentencesData = JSON.parse(rawData);
        
        if (!sentencesData || sentencesData.length === 0) {
            throw new Error('句子数据为空或格式不正确');
        }
        
        // 解析历史记录数据，如果有的话
        if (rawHistory) {
            historyData = JSON.parse(rawHistory);
            console.log('历史记录数据:', historyData);
        } else {
            historyData = {current_index: 0, results: {}, stats: {correct: 0, wrong: 0}};
        }
        
        console.log('解析后的句子数据:', sentencesData);
    } catch (error) {
        console.error('JSON解析错误:', error);
        console.error('原始数据:', practiceContainer.getAttribute('data-sentences'));
        alert('数据错误: 无法解析句子数据 - ' + error.message);
        return;
    }
    
    // 获取DOM元素
    const progressBar = document.querySelector('.progress');
    const progressText = document.querySelector('.progress-text');
    const cardNumber = document.querySelector('.card-number');
    const chineseText = document.querySelector('.chinese-text');
    const englishText = document.querySelector('.english-text');
    const englishInput = document.querySelector('.english-input');
    const feedback = document.querySelector('.feedback');
    const feedbackText = document.querySelector('.feedback-text');
    const wordFeedback = document.querySelector('.word-feedback');
    const wordSlots = document.querySelector('.word-slots');
    const playBtn = document.querySelector('.play-btn');
    const showBtn = document.querySelector('.show-btn');
    const checkBtn = document.querySelector('.check-btn');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const nextSentenceBtn = document.querySelector('.next-sentence-btn');
    const audioPlayer = document.querySelector('.audio-player');
    const summaryElement = document.querySelector('.practice-summary');
    const totalCount = document.querySelector('.total-count');
    const correctCount = document.querySelector('.correct-count');
    const wrongCount = document.querySelector('.wrong-count');
    const restartBtn = document.querySelector('.restart-btn');
    
    // 检查DOM元素是否都存在
    if (!chineseText) {
        console.error('找不到中文文本容器');
        alert('页面加载错误: 找不到中文文本容器');
        return;
    }
    
    if (!wordSlots) {
        console.error('找不到单词槽位容器');
        alert('页面加载错误: 找不到单词槽位容器');
        return;
    }
    
    // 练习状态
    let currentIndex = historyData ? historyData.current_index : 0;
    let correct = historyData ? historyData.stats.correct : 0;
    let wrong = historyData ? historyData.stats.wrong : 0;
    let answered = false;
    let currentWordCount = 0;
    
    // 初始化练习
    function initPractice() {
        // 如果有历史记录，使用历史记录的当前索引
        if (historyData && historyData.current_index < sentencesData.length) {
            currentIndex = historyData.current_index;
            correct = historyData.stats.correct;
            wrong = historyData.stats.wrong;
        } else {
            currentIndex = 0;
            correct = 0;
            wrong = 0;
        }
        
        updateProgressBar();
        loadSentence();
        summaryElement.classList.add('hidden');
        document.querySelector('.practice-card').classList.remove('hidden');
    }
    
    // 更新进度条
    function updateProgressBar() {
        const progress = ((currentIndex) / sentencesData.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${currentIndex}/${sentencesData.length}`;
    }
    
    // 生成单词槽位
    function generateWordSlots(sentence) {
        wordSlots.innerHTML = '';
        const words = sentence.english.split(' ');
        currentWordCount = words.length;
        
        console.log('生成单词槽位:', words);
        
        words.forEach((word, index) => {
            const slot = document.createElement('div');
            slot.className = 'word-slot';
            slot.dataset.index = index;
            slot.style.width = `${Math.max(50, word.length * 10)}px`;
            wordSlots.appendChild(slot);
        });
    }
    
    // 加载当前句子
    function loadSentence() {
        const sentence = sentencesData[currentIndex];
        console.log('当前加载句子:', sentence);
        
        if (!sentence || !sentence.chinese || !sentence.english) {
            console.error('句子数据不完整:', sentence);
            alert('数据错误: 句子数据不完整');
            return;
        }
        
        // 更新卡片
        cardNumber.textContent = currentIndex + 1;
        
        // 确保中文文本显示
        chineseText.textContent = sentence.chinese;
        console.log('设置中文:', sentence.chinese);
        
        englishText.textContent = sentence.english;
        englishInput.value = '';
        englishText.classList.add('hidden');
        feedback.classList.add('hidden');
        feedback.classList.remove('correct', 'wrong');
        wordFeedback.innerHTML = '';
        nextBtn.classList.add('hidden');
        checkBtn.classList.remove('hidden');
        
        // 生成单词槽位
        generateWordSlots(sentence);
        
        // 重置状态
        answered = false;
        
        // 设置即时输入监听
        setupInputMonitoring();
    }
    
    // 设置输入监控，提供即时反馈
    function setupInputMonitoring() {
        // 移除之前的事件监听器
        englishInput.removeEventListener('input', inputHandler);
        englishInput.removeEventListener('keydown', keydownHandler);
        
        // 添加新的事件监听器
        englishInput.addEventListener('input', inputHandler);
        englishInput.addEventListener('keydown', keydownHandler);
    }
    
    // 输入处理函数
    function inputHandler() {
        const inputWords = this.value.trim().split(' ');
        const slots = document.querySelectorAll('.word-slot');
        
        // 清除之前的标记
        slots.forEach(slot => {
            slot.className = 'word-slot';
            slot.innerHTML = '';
        });
        
        // 标记每个输入的单词
        inputWords.forEach((word, index) => {
            if (index < slots.length) {
                const slot = slots[index];
                const slotText = document.createElement('span');
                slotText.className = 'slot-text';
                slotText.textContent = word;
                
                // 如果有输入，尝试实时验证
                if (word) {
                    const sentence = sentencesData[currentIndex];
                    const correctWords = sentence.english.split(' ');
                    
                    if (index < correctWords.length) {
                        const isCorrect = word.toLowerCase() === correctWords[index].toLowerCase().replace(/[^\w]/g, '');
                        
                        if (isCorrect) {
                            slot.classList.add('correct');
                        } else {
                            slot.classList.add('wrong');
                        }
                    }
                }
                
                slot.appendChild(slotText);
            }
        });
    }
    
    // 键盘处理函数
    function keydownHandler(e) {
        if (e.key === 'Enter' && !answered) {
            checkAnswer();
        } else if (e.key === 'Enter' && answered) {
            nextSentence();
        }
    }
    
    // 保存进度
    function saveProgress() {
        fetch('/save_progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_name: fileName,
                current_index: currentIndex,
                correct: correct,
                wrong: wrong
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('进度保存成功:', data);
        })
        .catch(error => {
            console.error('保存进度错误:', error);
        });
    }
    
    // 检查答案
    function checkAnswer() {
        if (answered) return;
        
        const sentence = sentencesData[currentIndex];
        const userAnswer = englishInput.value.trim();
        
        if (!userAnswer) {
            alert('请输入你的答案');
            return;
        }
        
        // 发送请求检查答案
        fetch('/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                answer: userAnswer,
                correct: sentence.english,
                file_name: fileName,
                sentence_index: currentIndex
            })
        })
        .then(response => response.json())
        .then(data => {
            // 显示反馈
            feedback.classList.remove('hidden');
            
            if (data.correct) {
                feedback.classList.add('correct');
                feedbackText.textContent = '正确！';
                correct++;
            } else {
                feedback.classList.add('wrong');
                feedbackText.textContent = `错误！正确答案是: ${data.correct_answer}`;
                wrong++;
                englishText.classList.remove('hidden');
            }
            
            // 显示单词级别的反馈
            displayWordFeedback(data.word_results);
            
            // 更新UI
            checkBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
            answered = true;
        })
        .catch(error => {
            console.error('Error:', error);
            alert('检查答案时出错，请重试。');
        });
    }
    
    // 显示单词级别的反馈
    function displayWordFeedback(wordResults) {
        wordFeedback.innerHTML = '';
        
        wordResults.forEach((result, index) => {
            const wordElement = document.createElement('div');
            wordElement.className = `word-result ${result.correct ? 'correct' : 'wrong'}`;
            
            if (result.word) {
                wordElement.textContent = result.word;
            } else {
                wordElement.textContent = '(缺少)';
            }
            
            if (!result.correct && result.expected) {
                const expected = document.createElement('span');
                expected.className = 'expected';
                expected.textContent = `→ ${result.expected}`;
                wordElement.appendChild(expected);
            }
            
            wordFeedback.appendChild(wordElement);
            
            // 更新对应的槽位
            const slots = document.querySelectorAll('.word-slot');
            if (index < slots.length) {
                slots[index].className = `word-slot ${result.correct ? 'correct' : 'wrong'}`;
                
                if (!result.correct && result.expected) {
                    const errorElem = document.createElement('span');
                    errorElem.className = 'slot-error';
                    errorElem.textContent = result.expected;
                    slots[index].appendChild(errorElem);
                }
            }
        });
    }
    
    // 下一个句子
    function nextSentence() {
        currentIndex++;
        
        // 保存进度
        saveProgress();
        
        if (currentIndex >= sentencesData.length) {
            // 练习完成，显示总结
            showSummary();
        } else {
            // 加载下一个句子
            updateProgressBar();
            loadSentence();
        }
    }
    
    // 显示总结
    function showSummary() {
        // 停止计时器
        if (timerInterval) {
            clearInterval(timerInterval);
            timerActive = false;
        }
        
        document.querySelector('.practice-card').classList.add('hidden');
        summaryElement.classList.remove('hidden');
        
        totalCount.textContent = sentencesData.length;
        correctCount.textContent = correct;
        wrongCount.textContent = wrong;
        
        // 如果有计时，显示平均时间
        if (remainingSeconds > 0) {
            const selectedMinutes = parseInt(timeSelector.value);
            const usedSeconds = selectedMinutes * 60 - remainingSeconds;
            const avgTimePerSentence = (usedSeconds / (correct + wrong)).toFixed(1);
            
            // 添加平均时间显示
            const timeStatsElem = document.createElement('div');
            timeStatsElem.innerHTML = `
                <div>练习用时: ${Math.floor(usedSeconds / 60)}分${usedSeconds % 60}秒</div>
                <div>平均每句: ${avgTimePerSentence}秒</div>
            `;
            document.querySelector('.summary-stats').appendChild(timeStatsElem);
        }
    }
    
    // 播放当前句子
    function playAudio() {
        const sentence = sentencesData[currentIndex];
        
        // 显示加载状态
        playBtn.textContent = '加载中...';
        playBtn.disabled = true;
        
        // 获取或创建语音
        fetch('/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: sentence.english,
                id: sentence.id
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.use_browser_tts) {
                // 使用浏览器的语音合成API
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(data.text);
                    
                    // 尝试设置英语声音
                    for (let i = 0; i < voices.length; i++) {
                        if (voices[i].lang.includes('en')) {
                            utterance.voice = voices[i];
                            console.log('使用语音:', voices[i].name);
                            break;
                        }
                    }
                    
                    // 如果没有找到英语声音，尝试获取最新的声音列表
                    if (!utterance.voice && window.speechSynthesis.getVoices().length > 0) {
                        const freshVoices = window.speechSynthesis.getVoices();
                        for (let i = 0; i < freshVoices.length; i++) {
                            if (freshVoices[i].lang.includes('en')) {
                                utterance.voice = freshVoices[i];
                                console.log('使用新获取的语音:', freshVoices[i].name);
                                break;
                            }
                        }
                    }
                    
                    // 开始朗读事件
                    utterance.onstart = function() {
                        playBtn.textContent = '播放中...';
                    };
                    
                    // 结束朗读事件
                    utterance.onend = function() {
                        playBtn.textContent = '播放';
                        playBtn.disabled = false;
                    };
                    
                    // 错误事件
                    utterance.onerror = function(event) {
                        console.error('语音合成错误:', event);
                        playBtn.textContent = '播放';
                        playBtn.disabled = false;
                        alert('语音合成失败，请稍后再试');
                    };
                    
                    // 启动语音合成
                    window.speechSynthesis.speak(utterance);
                } else {
                    // 浏览器不支持语音合成
                    console.error('浏览器不支持语音合成');
                    playBtn.textContent = '播放';
                    playBtn.disabled = false;
                    alert('您的浏览器不支持语音合成功能');
                }
            } else if (data.audio_url) {
                // 后向兼容：如果服务器返回音频URL，则使用音频元素播放
                audioPlayer.src = data.audio_url;
                
                // 添加错误处理
                audioPlayer.onerror = function() {
                    console.error('音频播放失败:', audioPlayer.error);
                    playBtn.textContent = '播放';
                    playBtn.disabled = false;
                    alert('播放失败：暂无可用音频');
                };
                
                audioPlayer.play()
                .then(() => {
                    // 播放成功
                    playBtn.textContent = '播放中...';
                    
                    // 添加音频结束事件
                    audioPlayer.onended = () => {
                        playBtn.textContent = '播放';
                        playBtn.disabled = false;
                    };
                })
                .catch(playError => {
                    console.error('播放错误:', playError);
                    playBtn.textContent = '播放';
                    playBtn.disabled = false;
                    alert('暂无有效音频，请稍后再试');
                });
            } else {
                throw new Error('无可用的音频数据');
            }
        })
        .catch(error => {
            console.error('TTS错误:', error);
            playBtn.textContent = '播放';
            playBtn.disabled = false;
            alert('获取音频失败: ' + error.message);
        });
    }
    
    // 显示答案
    function showAnswer() {
        // 切换英文文本的显示状态
        if (englishText.classList.contains('hidden')) {
            // 当前是隐藏状态，改为显示
            englishText.classList.remove('hidden');
            showBtn.textContent = '隐藏答案';
        } else {
            // 当前是显示状态，改为隐藏
            englishText.classList.add('hidden');
            showBtn.textContent = '显示答案';
        }
    }
    
    // 添加事件监听器
    playBtn.addEventListener('click', playAudio);
    showBtn.addEventListener('click', showAnswer);
    checkBtn.addEventListener('click', checkAnswer);
    nextBtn.addEventListener('click', nextSentence);
    prevBtn.addEventListener('click', function() {
        if (currentIndex > 0) {
            // 保存当前答题状态，如果已经答题
            if (answered) {
                saveProgress();
            }
            
            // 前往上一个句子
            currentIndex--;
            updateProgressBar();
            loadSentence();
        } else {
            alert('已经是第一个句子了！');
        }
    });
    nextSentenceBtn.addEventListener('click', function() {
        if (currentIndex < sentencesData.length - 1) {
            // 保存当前答题状态，如果已经答题
            if (answered) {
                saveProgress();
            }
            
            // 前往下一个句子
            currentIndex++;
            updateProgressBar();
            loadSentence();
        } else {
            alert('已经是最后一个句子了！');
        }
    });
    restartBtn.addEventListener('click', initPractice);
    
    // 初始化练习
    initPractice();
}); 