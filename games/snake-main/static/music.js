document.addEventListener('DOMContentLoaded', () => {
    const backgroundMusic = document.getElementById('backgroundMusic');
    const musicToggleBtn = document.getElementById('musicToggleBtn');   // 背景音乐按钮
    const clickSound = document.getElementById('clickSound');   // 按钮音效
    const buttons = document.querySelectorAll('button');    // 普通按钮

    // 背景音乐切换
    musicToggleBtn.addEventListener('click', () => {
        if (backgroundMusic.paused) {
            backgroundMusic.play();
            musicToggleBtn.textContent = '🔊';
        } else {
            backgroundMusic.pause();
            musicToggleBtn.textContent = '🎵';
        }
    });

    // 为所有按钮添加点击音效
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            clickSound.play();
        });
    });
});