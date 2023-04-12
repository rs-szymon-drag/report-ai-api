import { OpenAI } from "langchain/llms"

if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI Credentials")
}

export default new OpenAI({
    temperature: 0,
})
