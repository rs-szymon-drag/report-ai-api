import * as dotenv from 'dotenv'
dotenv.config()

import serverless from 'serverless-http'
import express from 'express'
import cors from 'cors'
import pdfParse from "@cyber2024/pdf-parse-fixed"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import { PineconeStore } from "langchain/vectorstores/pinecone"
import Pinecone from "../clients/pinecone-client.mjs"
import multer from 'multer'

const upload = multer();

const app = express()
app.use(cors())
app.use(express.json());

const router = express.Router()

router.get('/', (req, res) => {
    res.send('Hello World!')
})

router.post('/upload', upload.single('pdf'), async (req, res) => {
    const buffer = Buffer.alloc(req.file.buffer)
    
    let parsedText = ''
    try {
        const text = await pdfParse(buffer)
        parsedText = text?.text
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

app.use('/.netlify/functions/api', router)
module.exports.handler = serverless(app)