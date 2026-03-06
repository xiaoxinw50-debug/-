const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'traveler_tale_secret_key'; 

// --- 内存数据库 (取代真实数据库) ---
const users = []; 
const orders = [];

app.use(cors()); 
app.use(bodyParser.json());

// --- API 路由 ---

// 1. 注册接口
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
    console.log(`🍃 [内存数据库] 新旅人归位：${username}`);
    res.json({ success: true, message: '契约建立成功' });
});

// 2. 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '24h' });
        console.log(`🔑 [内存数据库] 旅人进入：${user.nickname}`);
        res.json({
            success: true,
            token: token,
            user: {
                nickname: user.nickname,
                avatar: user.avatar,
                points: user.points
            }
        });
    } else {
        res.status(401).json({ success: false, message: '账号或口令错误' });
    }
});

// 3. 获取当前用户信息
app.get('/api/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: '请先登录' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ message: '凭证失效' });
        const user = users.find(u => u._id === decoded.userId);
        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false });
        }
    });
});

// 4. 提交订单接口
app.post('/api/orders', (req, res) => {
    // 简化处理，直接返回成功
    console.log(`📜 [内存数据库] 收到新订单`);
    res.json({ success: true, message: '契约已归档' });
});

// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    ⚜ 旅人驿站 [无敌兼容模式] 已就绪
    🚀 无需数据库，无需联网，直接运行！
    📍 本地入口: http://localhost:${PORT}
    -------------------------------------------
    `);
});