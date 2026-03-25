const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

console.log("APIキー:", process.env.GEMINI_API_KEY?.slice(0, 10));

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);

// 部署とメールアドレスのマッピング
const departments = {
  "道路・交通": "road@city.example.com",
  "公園・緑地": "park@city.example.com",
  "まちづくり・都市計画": "urban@city.example.com",
  "福祉・介護": "welfare@city.example.com",
  "子育て・保育": "childcare@city.example.com",
  "教育・学校": "education@city.example.com",
  "環境・ごみ": "environment@city.example.com",
  "防災・安全": "disaster@city.example.com",
  "国際・多文化共生": "international@city.example.com",
  "住宅・建築": "housing@city.example.com",
  "税金・手続き": "tax@city.example.com",
  "その他": "general@city.example.com",
  "要確認": "review@city.example.com"
};
// 嘆願をAIが仕分け→メール送信
app.post("/petition", async (req, res) => {
  try {
    const { title, city, content, email, name, genre } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    const prompt = `
                  以下の市民からの嘆願を分析してください。
                  タイトル: ${title}
                  ジャンル（ユーザー選択）: ${genre || "未選択"}
                  内容: ${content}

                  以下のJSON形式のみで返答してください（他のテキストは不要）:
                  {
                    "category": "道路・交通 or 公園・緑地 or まちづくり・都市計画 or 福祉・介護 or 子育て・保育 or 教育・学校 or 環境・ごみ or 防災・安全 or 国際・多文化共生 or 住宅・建築 or 税金・手続き or その他",
                    "summary": "内容を100文字以内で要約",
                    "isInappropriate": true or false,
                    "reason": "スパム・誹謗中傷・無関係な内容の場合その理由、適切な場合は空文字"  
                  }
                  `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean);

    const category = analysis.isInappropriate ? "要確認" : analysis.category;
    const toEmail = process.env.MAIL_USER;

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.MAIL_USER,
      subject: `【嘆願】${title}`,
      text: `
            カテゴリ: ${category}
            要約: ${analysis.summary}
            お名前: ${name || "匿名"}
            メールアドレス: ${email}
            お住まい: ${city}
            タイトル: ${title}
            ${analysis.isInappropriate ? `\n⚠️ 要確認: ${analysis.reason}\n` : ""}
            内容:
            ${content}
            `
    });

    res.json({ 
      success: true, 
      category,
      isInappropriate: analysis.isInappropriate 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3002, () => {
  console.log(`サーバー起動中：http://localhost:${process.env.PORT || 3002}`);
});