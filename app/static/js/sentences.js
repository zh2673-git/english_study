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
    
    // 选择所有播放按钮
    const playButtons = document.querySelectorAll('.play-btn');
    
    // 为每个播放按钮添加点击事件
    playButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sentenceId = this.getAttribute('data-id');
            const sentenceCard = this.closest('.sentence-card');
            const englishText = sentenceCard.getAttribute('data-english');
            const audioPlayer = document.getElementById(`audio-${sentenceId}`);
            
            // 显示加载状态
            this.textContent = '加载中...';
            this.disabled = true;
            
            // 获取或创建语音
            fetch('/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: englishText,
                    id: sentenceId
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
                        utterance.onstart = () => {
                            this.textContent = '播放中...';
                        };
                        
                        // 结束朗读事件
                        utterance.onend = () => {
                            this.textContent = '播放';
                            this.disabled = false;
                        };
                        
                        // 错误事件
                        utterance.onerror = (event) => {
                            console.error('语音合成错误:', event);
                            this.textContent = '播放';
                            this.disabled = false;
                            alert('语音合成失败，请稍后再试');
                        };
                        
                        // 启动语音合成
                        window.speechSynthesis.speak(utterance);
                    } else {
                        // 浏览器不支持语音合成
                        console.error('浏览器不支持语音合成');
                        this.textContent = '播放';
                        this.disabled = false;
                        alert('您的浏览器不支持语音合成功能');
                    }
                } else if (data.audio_url) {
                    // 后向兼容：使用音频元素播放
                    audioPlayer.src = data.audio_url;
                    
                    // 添加错误处理
                    audioPlayer.onerror = () => {
                        console.error('音频播放失败:', audioPlayer.error);
                        this.textContent = '播放';
                        this.disabled = false;
                        alert('播放失败：暂无可用音频');
                    };
                    
                    audioPlayer.play()
                    .then(() => {
                        // 播放成功
                        this.textContent = '播放中...';
                        
                        // 添加音频结束事件
                        audioPlayer.onended = () => {
                            this.textContent = '播放';
                            this.disabled = false;
                        };
                    })
                    .catch(playError => {
                        console.error('播放错误:', playError);
                        this.textContent = '播放';
                        this.disabled = false;
                        alert('暂无有效音频，请稍后再试');
                    });
                } else {
                    throw new Error('无可用的音频数据');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                this.textContent = '播放';
                this.disabled = false;
                alert('获取音频失败: ' + error.message);
            });
        });
    });
}); 