import * as dotenv from 'dotenv'
dotenv.config()

import serverless from 'serverless-http'
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fs from 'fs'
import pdfParse from "@cyber2024/pdf-parse-fixed"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import { PineconeStore } from "langchain/vectorstores/pinecone"
import Pinecone from "./clients/pinecone-client.mjs"

const app = express()
app.use(cors())

const router = express.Router()

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('pdf'), async (req, res) => {
    const pdfPath = req.file.path;
    const pdfBuffer = fs.readFileSync(pdfPath);

    let parsedText
    

    try {
        parsedText = await pdfParse(pdfBuffer)
        parsedText = parsedText?.text
    } catch {
        res.status(500).send('Error parsing PDF file')
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    })
    const texts = await textSplitter.splitText(parsedText)

    const embeddings = new OpenAIEmbeddings()
    const pineconeClient = await Pinecone()
    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME)

    try {
        await PineconeStore.fromTexts(texts, {}, embeddings, {
            pineconeIndex: index,
            namespace: "test",
            textKey: "text",
        })
        res.send({
            status: "success",
            message: "Successfully uploaded PDF",
            chunks: texts,
        })
    } catch {
        res.status(500).send('Error while uploading to pinecone')
    }
});

app.use('/.netlify/functions/index', router)
module.exports.handler = serverless(app)