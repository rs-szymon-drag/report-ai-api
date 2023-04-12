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

const app = express()
app.use(cors())

const router = express.Router()

router.get('/', (req, res) => {
    res.send('Hello World!')
})

router.post('/upload', async (req, res) => {
    
    const pdfBuffer = Buffer.from(req.body, 'base64').toString('binary')
    console.log("hi")
    let parsedText
    
    try {
        parsedText = await pdfParse.pdfBufferToText(pdfBuffer)
        console.log(parsedText)
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

app.use('/.netlify/functions/api', router)
module.exports.handler = serverless(app)