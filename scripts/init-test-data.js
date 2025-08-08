// MongoDB test data initialization script

// Connect to test database
use('test');

// Create users collection and insert test data
db.users.insertMany([
  {
    name: 'John Doe',
    age: 25,
    email: 'john@example.com',
    city: 'Beijing',
    createdAt: new Date()
  },
  {
    name: 'Jane Smith',
    age: 30,
    email: 'jane@example.com',
    city: 'Shanghai',
    createdAt: new Date()
  },
  {
    name: 'Bob Wilson',
    age: 28,
    email: 'bob@example.com',
    city: 'Guangzhou',
    createdAt: new Date()
  }
]);

// Create products collection and insert test data
db.products.insertMany([
  {
    name: 'iPhone 15',
    price: 7999,
    category: 'phone',
    brand: 'Apple',
    stock: 100,
    createdAt: new Date()
  },
  {
    name: 'MacBook Pro',
    price: 15999,
    category: 'laptop',
    brand: 'Apple',
    stock: 50,
    createdAt: new Date()
  },
  {
    name: 'iPad Air',
    price: 4599,
    category: 'tablet',
    brand: 'Apple',
    stock: 75,
    createdAt: new Date()
  }
]);

// Create orders collection and insert test data
db.orders.insertMany([
  {
    orderId: 'ORD001',
    userId: ObjectId(),
    products: [
      { productId: ObjectId(), quantity: 1, price: 7999 }
    ],
    totalAmount: 7999,
    status: 'completed',
    createdAt: new Date()
  },
  {
    orderId: 'ORD002',
    userId: ObjectId(),
    products: [
      { productId: ObjectId(), quantity: 1, price: 15999 },
      { productId: ObjectId(), quantity: 1, price: 4599 }
    ],
    totalAmount: 20598,
    status: 'pending',
    createdAt: new Date()
  }
]);

print('Test data initialization completed!');
print('Created database: test');
print('Created collections: users, products, orders');
print('Users count:', db.users.countDocuments());
print('Products count:', db.products.countDocuments());
print('Orders count:', db.orders.countDocuments());