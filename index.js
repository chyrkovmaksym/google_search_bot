const TelegramApi = require('node-telegram-bot-api');
const google = require('googlethis');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { TOKEN } = require('./config');

const bot = new TelegramApi(TOKEN, { polling: true });

bot.setMyCommands([{ command: '/start', description: 'start' }]);

const hearts = ['❤️', '💛', '💚', '💙', '💜', '🧡'];
const printHeart = (index, prevId, thisId) => {
  let res = '';
  for (let i = 0; i < index; i++) {
    res += `${hearts[thisId]} `;
  }
  for (let i = index - 1; i < 6; i++) {
    res += `${hearts[prevId]} `;
  }
  return res;
};
bot.on('polling_error', console.log);

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.chat.first_name;
  await bot.sendMessage(chatId, 'Очікуйте...');
  await bot
    .downloadFile(msg.photo[msg.photo.length - 1].file_id, './images')
    .then(async (path) => {
      await Tesseract.recognize(path, 'ukr').then(
        async ({ data: { text } }) => {
          await bot.sendMessage(chatId, text);
          startSearch(chatId, text);
        }
      );
    });
});

bot.on('text', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const name = msg.chat.first_name;
  if (text === '/start') {
    let k = 0;
    await bot.sendMessage(
      chatId,
      'Привіт! Я вмію знаходити для вас інформацію, повідомляти погоду та перекладати ваш текст на безліч мов. Достатньо ввести пошуковий запит, а я спробую дати вам відповідь. Приклад: "погода в Україні". Також тепер доступна функція виконування запиту з картинки. Достатньо надіслати мені фото з чітким і контрастним текстом українською мовою. Приємного користування)'
    );
    await bot.sendMessage(chatId, printHeart(0, 0, 5)).then((ownMsg) => {
      let i = 0;
      let prevId = 5;
      let thisId = 0;
      let k = 0;
      const timer = setInterval(() => {
        bot.editMessageText(printHeart(i, prevId, thisId), {
          message_id: ownMsg.message_id,
          chat_id: chatId,
        });
        i++;
        if (i === 7) {
          i = 0;
          prevId < hearts.length - 1 ? prevId++ : (prevId = 0);
          thisId < hearts.length - 1 ? thisId++ : (thisId = 0);
          k++;
          if (k === 8) {
            lastMessage(ownMsg.message_id, chatId);
            clearInterval(timer);
          }
        }
      }, 300);
    });
  } else {
    startSearch(chatId, text);
  }
});

async function startSearch(chatId, query) {
  const options = {
    page: 0,
    safe: false,
    additional_params: {
      hl: 'ua',
    },
  };

  const response = await google.search(query, options);
  await bot.sendMessage(chatId, 'Виконую пошук...');
  if (response.knowledge_panel.description !== 'N/A') {
    await bot.sendMessage(chatId, response.knowledge_panel.description);
    await bot.sendMessage(chatId, 'Більше інформації тут: ');
    await bot.sendMessage(chatId, response.knowledge_panel.url);
  } else if (response.translation !== undefined) {
    await bot.sendMessage(
      chatId,
      `${response.translation.source_language.split(' ')[0]}: ${
        response.translation.source_text
      } \n${response.translation.target_language}: ${
        response.translation.target_text
      }`
    );
  } else if (response.weather !== undefined) {
    await bot.sendMessage(
      chatId,
      `Розташування: ${response.weather.location} \nПрогноз: ${response.weather.forecast} \nТемпература: ${response.weather.temperature} °C \nВологістть повітря: ${response.weather.humidity} \nЙмовірність опадів: ${response.weather.precipitation} \nШвидкість вітру: ${response.weather.wind}`
    );
  } else {
    if (response.results.length >= 2) {
      await bot.sendMessage(
        chatId,
        'Ось декілька посилань, що можуть вас зацікавити:'
      );
      for (let i = 0; i < 2; i++) {
        await bot.sendMessage(chatId, response.results[i].url);
      }
    } else {
      await bot.sendMessage(
        chatId,
        `На жаль, мені не вдалося знайти інформацію по запиту "${query}"`
      );
    }
  }
}

async function lastMessage(message_id, chatId) {
  await bot.editMessageText('🧡 🧡 🧡 🧡 🧡 🧡 ', {
    message_id: message_id,
    chat_id: chatId,
  });
}
