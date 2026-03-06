const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'traveler_tale_super_secret_key'; // JWT 签名密钥

// 核心配置：获取云端数据库地址
// 如果 Render 没有配置环境变量，本地测试时默认连接本地数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/traveler_shop';

// --- 中间件 ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// --- 连接数据库 ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('🍃 [数据库] MongoDB 契约石碑已连接！'))
    .catch(err => console.error('❌ [数据库] 连接失败，请检查 MONGODB_URI:', err));

// --- 定义数据模型 (Schema) ---
// 1. 旅人 (用户) 模型
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // 账号必须唯一
    password: { type: String, required: true },
    nickname: { type: String, default: '无名旅人' },
    avatar: { type: String },
    points: { type: Number, default: 880 }
});
const User = mongoose.model('User', UserSchema);

// 2. 契约 (订单) 模型
const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 绑定到具体用户
    items: Array,
    date: String,
    total: Number,
    status: { type: String, default: '已结契' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- 身份校验中间件 (拦截没有 Token 的非法请求) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '驿站守卫：出示你的通行令' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: '驿站守卫：通行令已失效' });
        req.user = user; // 将解析出的 userId 挂载到请求上
        next();
    });
};

// --- API 路由 ---

// 注册接口
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        // 1. 检查账号是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: '该旅人账号已被注册，请换一个' });
        }
        // 2. 建立新账号
        const newUser = new User({
            username,
            password, // 实际生产中密码应使用 bcrypt 加密，这里为了演示保持明文
            nickname: nickname || '旅人',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        });
        await newUser.save();
        res.json({ success: true, message: '契约建立成功' });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器开小差了' });
    }
});

// 登录接口
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // 严格匹配用户名和密码
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ success: false, message: '账号或通行口令不正确' });
        }
        // 签发 Token，记住该用户的 ID
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ 
            success: true, 
            token, 
            user: { nickname: user.nickname, avatar: user.avatar, points: user.points } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '登录异常' });
    }
});

// 获取当前用户信息 (用于页面刷新后恢复登录状态)
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ success: false });
        res.json({ success: true, user: { nickname: user.nickname, avatar: user.avatar, points: user.points } });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 提交订单
app.post('/api/orders', authenticateToken, async (req, res) => {
    const { items, date, total } = req.body;
    try {
        const newOrder = new Order({
            userId: req.user.userId, // 从 Token 中提取的真实用户 ID
            items,
            date,
            total
        });
        await newOrder.save();
        res.json({ success: true, message: '契约已归档' });
    } catch (err) {
        res.status(500).json({ success: false, message: '归档失败' });
    }
});

// 获取历史订单
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        // 只查询属于当前用户的订单，并按时间倒序排列
        const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: '获取记录失败' });
    }
});

// --- 前端路由兜底 (适配 Express 5) ---
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`🚀 驿站服务器已在端口 ${PORT} 启动`);
});
