const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path'); // 新增：处理文件路径

const app = express();
// 关键点：Render 必须使用环境变量分配的端口，否则会部署失败
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'traveler_tale_secret_key'; 

// --- 中间件 ---
app.use(cors()); 
app.use(bodyParser.json());

// 静态资源托管：确保 HTML、CSS、JS 文件能被浏览器访问
app.use(express.static(path.join(__dirname, '.')));

// --- 内存数据库 ---
const users = []; 

// --- API 路由 ---
app.post('/api/register', (req, res) => {
    const { username, password, nickname } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ success: false, message: '账号已存在' });
    }
    const newUser = {
        _id: Date.now().toString(),
        username,
        password, 
        nickname: nickname || "无名旅人",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        points: 880
    };
    users.push(newUser);
    res.json({ success: true, message: '契约建立成功' });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ success: true, token, user: { nickname: user.nickname, avatar: user.avatar, points: user.points } });
    } else {
        res.status(401).json({ success: false, message: '账号或口令错误' });
    }
});

// --- 前端兜底逻辑 ---
// 如果访问的不是 /api 开头的路径，全部返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`服务器已在端口 ${PORT} 启动`);
});
