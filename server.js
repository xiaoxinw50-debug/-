const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'traveler_tale_super_secret_key';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/traveler_shop';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

mongoose.connect(MONGODB_URI)
    .then(() => console.log('🍃 [数据库] MongoDB 契约石碑已连接！'))
    .catch(err => console.error('❌ [数据库] 连接失败:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, 
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nickname: { type: String, default: '无名旅人' },
    avatar: { type: String },
    points: { type: Number, default: 880 } // 初始赠送880积分
});
const User = mongoose.model('User', UserSchema);

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: Array,
    date: String,
    total: Number,
    pointsEarned: Number, // 本次获得的积分
    pointsSpent: Number,  // 本次消耗的积分
    status: { type: String, default: '已结契' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '请出示通行令' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: '通行令已失效' });
        req.user = user; 
        next();
    });
};

app.post('/api/register', async (req, res) => {
    const { username, phone, password, nickname } = req.body;
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { phone }] });
        if (existingUser) return res.status(400).json({ success: false, message: '该账号或手机号已被注册' });
        
        const newUser = new User({ username, phone, password, nickname: nickname || '旅人', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` });
        await newUser.save();
        res.json({ success: true, message: '契约建立成功' });
    } catch (err) { res.status(500).json({ success: false, message: '服务器开小差了' }); }
});

app.post('/api/login', async (req, res) => {
    const { loginId, password } = req.body; 
    try {
        const user = await User.findOne({ $or: [{ username: loginId }, { phone: loginId }], password });
        if (!user) return res.status(401).json({ success: false, message: '账号/手机号或口令不正确' });
        
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ success: true, token, user: { nickname: user.nickname, avatar: user.avatar, points: user.points } });
    } catch (err) { res.status(500).json({ success: false, message: '登录异常' }); }
});

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ success: false });
        res.json({ success: true, user: { nickname: user.nickname, avatar: user.avatar, points: user.points } });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 🌟 升级版：提交订单与积分结算
app.post('/api/orders', authenticateToken, async (req, res) => {
    const { items, date, total } = req.body;
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

        // 1. 计算本次要消耗的积分 (购物车里 isRedemption 为 true 的商品)
        const pointsSpent = items.reduce((sum, item) => sum + (item.pointsCost || 0), 0);
        if (user.points < pointsSpent) {
            return res.status(400).json({ success: false, message: '积分余额不足，无法结契' });
        }

        // 2. 计算本次消费获得的积分 (1元 = 1积分，向下取整)
        const pointsEarned = Math.floor(total);

        // 3. 更新用户余额：当前积分 - 花掉的 + 赚到的
        user.points = user.points - pointsSpent + pointsEarned;
        await user.save();

        // 4. 生成订单记录
        const newOrder = new Order({ userId: req.user.userId, items, date, total, pointsEarned, pointsSpent });
        await newOrder.save();

        res.json({ success: true, message: '契约已归档', newPoints: user.points });
    } catch (err) {
        res.status(500).json({ success: false, message: '归档失败' });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) { res.status(500).json({ success: false, message: '获取记录失败' }); }
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🚀 驿站服务器已在端口 ${PORT} 启动`));
