// MongoDB初始化脚本
// 创建应用数据库和用户

print('开始初始化MongoDB数据库...');

// 切换到admin数据库
db = db.getSiblingDB('admin');

// 创建应用用户
db.createUser({
  user: 'mongo_view_user',
  pwd: 'mongo_view_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'mongo_view'
    },
    {
      role: 'dbAdmin',
      db: 'mongo_view'
    }
  ]
});

print('应用用户创建完成');

// 切换到应用数据库
db = db.getSiblingDB('mongo_view');

// 创建示例集合和数据
db.createCollection('connections');
db.createCollection('queries');
db.createCollection('settings');

// 插入示例连接配置
db.connections.insertOne({
  name: '本地MongoDB',
  host: 'localhost',
  port: 27017,
  database: 'test',
  username: '',
  password: '',
  ssl: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 插入示例查询
db.queries.insertOne({
  name: '查询所有用户',
  query: 'db.users.find({})',
  database: 'test',
  collection: 'users',
  createdAt: new Date(),
  updatedAt: new Date()
});

// 插入默认设置
db.settings.insertOne({
  theme: 'light',
  language: 'zh-CN',
  autoSave: true,
  queryTimeout: 30000,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('示例数据插入完成');
print('MongoDB初始化完成！');