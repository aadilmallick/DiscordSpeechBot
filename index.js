const express = require("express");
const app = express();
const Discord = require("discord.js");
const axios = require('axios');
const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES"]});
client.login(process.env.token);

const API_KEY = process.env.API_KEY_AADIL;
const INVITE = "https://discord.gg/XkZh5xb8";

let isTranscribing = false;
let id;
let data;

app.set("view engine", "ejs");

const assembly = axios.create({
    baseURL: "https://api.assemblyai.com/v2",
    headers: {
        authorization: `${API_KEY}`,
        "content-type": "application/json",
    },
});

app.listen(3000, () => {
  console.log("Transcribe Bot is running!");
})

app.get("/", (req,res) => {
  res.render("home.ejs")
})

app.get("/resultsjson", (req,res) => {
  if (!isTranscribing) {
    return res.render("error.ejs")
  }
  
  assembly
    .get(`/transcript/${id}`)
    .then((rs) => res.send(JSON.stringify(rs.data)))
    .catch((err) => console.error(err));

})

app.get("/finalresults" , (req,res) => {
    const numWords = data.words.length;
    const text = data.text;
    const audioURL = data.audio_url;


    const sentiment = data.sentiment_analysis_results.map( (obj) => obj.sentiment);
    const positiveCount = sentiment.filter( (value) => value === "POSITIVE").length;
    const negativeCount = sentiment.filter( (value) => value === "NEGATIVE").length;
    const neutralCount = sentiment.filter( (value) => value === "NEUTRAL").length;

    const maxSentimentNum = Math.max(positiveCount , negativeCount, neutralCount)

    const maxSentiment = positiveCount === maxSentimentNum ? "POSITIVE" : (negativeCount === maxSentimentNum ? "NEGATIVE" : "POSITIVE")


    const categories = data.iab_categories_result.summary;

    let maxCat = "";
    let maxCatVal = 0;

    for (let topic in categories) {
      if (categories[topic] > maxCatVal) {
        maxCat = topic;
        maxCatVal = categories[topic];
      }
    }
    
    res.render("results.ejs" , {numWords, text, maxSentiment, maxCat, audioURL})
})

app.get("/results", (req,res) => {
  if (!isTranscribing) {
    return res.send("😞 There is nothing to transcribe! 😞");
  }
  
  assembly.get(`/transcript/${id}`)
  .then((rs) => {
    
    if (rs.data.status === "error") {
      return res.render("error.ejs")
    }

    if (rs.data.status !== "completed") {
      res.redirect("/results");
    }

    else {
      data = rs.data;
      res.redirect("finalresults");
    } 
  })
  .catch((err) => {
    console.log(err);
    return res.render("error.ejs")
  })
    
    
  
})

var link;

client.on("messageCreate", message => {
  if(message.content === "!help"){
    let embed = new Discord.MessageEmbed()
    .setTitle("📙 SUPPORT 📙")
    .setDescription("⬇️ Paste your audio below ⬇️")
    .setColor("RED")

    message.channel.send({embeds : [embed]})
  }

  if(message.content.startsWith("https://") && message.content.endsWith(".mp3")){
    link = message.content;
    console.log(link);  
    message.channel.send("👍 This is a VALID link! 👍");
  }

  if(message.content === "!transcribe") {


      if (!link) {
        message.channel.send("❌ The Link is Invalid! You must valdiate before transcription.")
      }
      
      else {

        assembly
        .post("/transcript", {
            audio_url: `${link}`,
            iab_categories : true,
            sentiment_analysis: true,
            entity_detection : true
        })
        .then((res) => {
          console.log("Success!");
          console.log(res.data);
          id = res.data.id;
          isTranscribing = true;

        let embed1 = new Discord.MessageEmbed()
        .setTitle("🚧 TRANSCRIPTION IN PROCESS 🚧")
        .setDescription("️✏️ Transcribing Audio... ✏️")
        .setFooter("🌐 Return to Website 🌐")
        .setColor("GREEN")
        message.channel.send({embeds : [embed1]})
        
        })
        .catch((err) => message.channel.send("👾 Error! 👾"));
        

        

      }
    

  }
    

})







