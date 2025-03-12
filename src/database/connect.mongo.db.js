import mongoose from "mongoose";
import "dotenv/config";
import logger from "../utils/winston.logger.js";

const connectionString = process.env.MONGO_URI;
mongoose.set("strictQuery", false);

const connectDatabase = async () => {
    try {
        await mongoose.connect(connectionString);
        logger.info("Connection established to MongoDB database successfully!");
    } catch (error) {
        logger.error("Error connecting to MongoDB: ", error);
    }
};

export default connectDatabase;
