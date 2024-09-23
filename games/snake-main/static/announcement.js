// 找到按钮和游戏说明的元素
const toggleInstructionsBtn = document.getElementById('toggleInstructionsBtn');

// 添加按钮点击事件监听器
toggleInstructionsBtn.addEventListener('click', function () {
    alert('📜游戏说明\n点击开始按钮后，按下任意方向开始移动💨\n玩家可以选择游戏难度，难度越高，移动速度越快\n\n单人模式😀\n撞墙或撞到自己游戏结束❌\n电脑玩家💻使用键盘方向键进行移动，手机玩家📱使用🔼🔽◀️▶️进行移动\n\n双人模式😀😀\n新增规则：碰撞到对方身体游戏结束❌\n玩家一为🟩，手机📱上使用左方🔼🔽◀️▶️进行移动，电脑💻上使用方向键移动\n玩家二为🟦，手机📱上使用右方🔼🔽◀️▶️进行移动，电脑💻上使用WASD进行移动\n击杀对方获得游戏胜利🎉🎉🎉')
});
