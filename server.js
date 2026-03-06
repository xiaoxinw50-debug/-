const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'traveler_tale_secret_key'; 

// 中间件配置
app.use(cors()); 
app.use(bodyParser.json());

// 静态文件托管：优先寻找静态资源
app.use(express.static(path.join(__dirname, '.')));

// --- API 路由 ---
app.post('/api/register', (req, res) => {
    const { username, password, nickname } = req.body;
    res.json({ success: true, message: '契约建立成功' });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const token = jwt.sign({ userId: 'demo' }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ success: true, token, user: { nickname: "旅人", avatar: "", points: 880 } });
});

// --- 核心修复：适配 Express 5.x 的路由通配 ---
// 使用正则表达式 /.*/ 替代 '*'，解决 PathError
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
