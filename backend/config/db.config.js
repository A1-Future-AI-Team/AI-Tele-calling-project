import mongoose from 'mongoose';

class Database {
    constructor() {
        this.connection = null;
    }

    async connect() {
    try {
            const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/fullstack-app';

            this.connection = await mongoose.connect(mongoURI);
            
            console.log(`📦 MongoDB Connected: ${this.connection.connection.host}`);
            
            // Handle connection events
            mongoose.connection.on('disconnected', () => {
                console.log('📦 MongoDB Disconnected');
            });

            mongoose.connection.on('error', (err) => {
                console.error('📦 MongoDB Error:', err);
            });

    } catch (error) {
            console.error('📦 Database connection failed:', error.message);
        process.exit(1);
    }
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            console.log('📦 MongoDB connection closed');
        } catch (error) {
            console.error('📦 Error closing database connection:', error);
        }
    }

    getConnection() {
        return this.connection;
    }
}


const database = new Database();

const connectDB = () => database.connect();

export default connectDB;