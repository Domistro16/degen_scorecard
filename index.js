import { Client, GatewayIntentBits, AttachmentBuilder } from "discord.js";
import axios from 'axios';
import { createCanvas, loadImage, registerFont } from 'canvas';
import 'dotenv/config';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const WHALE_STATUS = {
    KRAKEN: { min: 50,  tag: "KRAKEN" },
    WHALE: { min: 49, tag: "WHALE" },
    SHARK: { min: 29, tag: "SHARK" },
    FISH: { min: 14, tag: "FISH" },
    PLEB: { min: 5, tag: "PLEB" }
};


const sei_key = process.env.KEY || ''

const getWhaleStatus = (balance) => { 
    if (balance < WHALE_STATUS.PLEB.min || balance == Infinity) {
        return WHALE_STATUS.PLEB;
    } else if (balance <= WHALE_STATUS.FISH.min) {
        return WHALE_STATUS.FISH;
    } else if (balance <= WHALE_STATUS.SHARK.min) {
        return WHALE_STATUS.SHARK;
    } else if(balance <= WHALE_STATUS.WHALE.min){
        return WHALE_STATUS.WHALE;
    } else {
        return WHALE_STATUS.KRAKEN
    }
};

const api_key = process.env.COVALENT_API || ''
const key = process.env.API_KEY

const NFT_API_URL = "https://api.covalenthq.com/v1/sei-mainnet/address/";
const NFT_B_API_URL = "https://api.covalenthq.com/v1/sei-mainnet/address/"

const calculateWalletVolume = async(transactions) => {
    // Sum up all the `value_quote` fields
    const totalVolume = transactions.reduce((total, transaction) => {
      return total + (parseFloat(transaction.value)/ Math.pow(10, 18) || 0); // Ensure no `undefined` values
    }, 0);

    let memeVolume = 0;
    // /* for(const item of transactions){
    //     if(item.log_events.supports_erc == "erc-20"){
    //         memeVolume += item.value
    //     }else{
    //         memeVolume += 0;
    //     }
    //     await delay(500)
    // } */

  
    return totalVolume;
  }

  async function fetchPaginatedData(address) {
            let hasNextPage = true;
            let currentParams = {
                offset: 0,
                limit: 50,
            };
            let items = [];
            const apiUrl = `https://seitrace.com/insights/api/v2/addresses/transactions?limit=${currentParams.limit}&offset=${currentParams.offset}&chain_id=pacific-1&address=${address}&status=SUCCESS`;
            
            while (hasNextPage) {
                try {
                    const options = {
                        method: 'GET',
                        headers: {accept: 'application/json', 'x-api-key': `${sei_key}` }
                    }
                    const response = await axios.get(apiUrl, options);
                    items = items.concat(response.data.items);
                    if (response.data.next_page_params) {
                        currentParams.offset = currentParams.offset + 50;
                        currentParams.limit = response.data.next_page_params.limit;
                    } else {
                        hasNextPage = false;
                    }
                } catch (error) {
                    console.error('Error fetching page:', error);
                    throw error;
                }

            }
    const response = await calculateWalletVolume(items);
    console.log("volume:", response)
    return response || 0;
  }
  
const getFirstNft = async (items, address) => {
    let nftsArray = []
    for (const item of items){
        console.log("nft addresses: ", item.contract_address)
        if(item.supports_erc == "erc-721"){
            
    const options = {
        method: 'GET',
        headers: {accept: 'application/json', 'x-api-key': `${sei_key}` }
    }

    const response = await axios(`https://seitrace.com/insights/api/v2/token/erc721/transfers?offset=0&chain_id=pacific-1&contract_address=${item.contract_address}&wallet_address=${address}`, options)
    const nft = sortArray(response.data.items);
    if(response.data.items.length > 0){
    const n = {
        name: nft.token_instance.token_name,
        timestamp: nft.timestamp
    }
    nftsArray.push(n);
}
} else if(item.supports_erc == "erc-1155"){
    const options = {
        method: 'GET',
        headers: {accept: 'application/json', 'x-api-key': `${sei_key}` }
    }

    const response = await axios(`https://seitrace.com/insights/api/v2/token/erc1155/transfers?offset=0&chain_id=pacific-1&contract_address=${item.contract_address}&wallet_address=${address}`, options)
    
    if(response.data.length > 0){
    const items = response.data.items;
    const nft = sortArray(items);
    const n = {
        name: nft.token_instance.token_name,
        timestamp: nft.timestamp
    }
    nftsArray.push(n);
}
}
    await delay(500);
}
    const firstNft = sortArray(nftsArray);
    return firstNft;

}
const getPrice = async (address) => {
    await delay(500);
    const options = {
        method: 'GET',
        headers: {accept: '*/*', 'x-api-key': `${key|| ''}`}
    };
    console.log(address);
    const url = `https://api-sei.reservoir.tools/collections/v7?id=${address}`;
    const response = await axios(url, options);

    const collection = response.data.collections[0];
    let floorPriceDecimal = 0;
    let floorPriceNative = 0;

    if (collection.floorAsk.price == null) {
        floorPriceDecimal = 0;
        floorPriceNative = 0;
    } else {
        floorPriceDecimal = collection.floorAsk.price.amount.decimal;
        floorPriceNative = collection.floorAsk.price.amount.native;
    }
    const supply = parseFloat(collection.supply);
    console.log("ssupply:", supply)
    console.log(floorPriceNative);

    return { floorPriceNative, supply };
};


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSupply = async (address) => {
    const options = {
        method: "GET",
        headers: {accept: 'application/json', 'X-API-KEY': '' }
    }
    const burl = `https://seitrace.com/insights/api/v2/token/erc20?chain_id=pacific-1&contract_address=${address}`
    const response = await axios(burl, options)
    let supply = 0
    if(response.data && response.data){
        const iSupply = parseFloat(response.data.token_total_supply);
        console.log("supply", iSupply)
        supply = iSupply;
    }

    return supply;
}
const getCoins = async (address) => {
    try{
        const url = `https://api.covalenthq.com/v1/sei-mainnet/address/${address}/balances_v2/`;
        const options = {
            headers: { Authorization: `Bearer ${api_key}` }
        };

        // Make the API call with axios
        const response = await axios.get(url, options);

    console.log(response.data.data);
  

    let tokenBalance = 0;
    let totalsupply = 0;
    if(response.data.data && response.data.data.items){
    const items = response.data.data.items;
    if(items && items.length > 0){
        let balance = 0;
        let supply = 0;
    for(const item of items){
        if(!item.native_token){
            const bal = parseFloat(item.balance) / Math.pow(10, item.contract_decimals);
            balance += bal;
            const sup = await getSupply(item.contract_address);

            supply += sup;
        }else{
            balance += 0;
            supply += 0;
        }
        await delay(500)
    }
    tokenBalance = balance;
    totalsupply = supply;
}
    }
   const status = getWhaleStatus(tokenBalance, totalsupply);
   const mresponse = await fetchPaginatedData(`https://api.covalenthq.com/v1/sei-mainnet/bulk/transactions/${address}/`)
    console.log("volume:", volume);
   return {tokenBalance, status, volume, mresponse};
    }
    catch(error){
        console.error("Error fetching Coins:", error);
        return 0;
    }
};
const sortArray = (items) => {
    items.sort((a, b) => {
        const dateA = new Date(a["timestamp"]);
        const dateB = new Date(b["timestamp"]);
        return dateA - dateB; // Sort in ascending order
      });

      return items[0];
}


const getNfts = async (address) => {


    try {
        let nftBalance = 0;
        let WhaleArray = [];
        let erc_721 = [];
        let erc_1155 = [];
        let fnft;
        let seiAddress;
        try{
        // Define the request URL and headers
        const url = `https://seitrace.com/insights/api/v2/token/erc721/balances?offset=0&chain_id=pacific-1&address=${address}`;
        const options = {
            method: 'GET',
            headers: {accept: 'application/json', 'x-api-key': `${sei_key}` }
        }
        // Make the API call with axios
        const response = await axios.get(url, options)
        let items;
        if(response.data && response.data.items){
            items = response.data.items;
        }
        
        async function fetchAllPages(items) {
            let hasNextPage = true;
            let currentParams = {
                offset: 50,
                limit: 50,
            };
            const apiUrl = `https://seitrace.com/insights/api/v2/token/erc721/balances?limit=${currentParams.limit}&offset=${currentParams.offset}&chain_id=pacific-1&address=${address}`;
        
            while (hasNextPage) {
                try {
                    const options = {
                        method: 'GET',
                        headers: {accept: 'application/json', 'x-api-key': `${sei_key}` }
                    }
                    const response = await axios.get(apiUrl, options);
                    items = items.concat(response.data.items);
                    if (response.data.next_page_params) {
                        currentParams.offset = response.data.next_page_params.offset;
                        currentParams.limit = response.data.next_page_params.limit;
                    } else {
                        hasNextPage = false;
                    }
                } catch (error) {
                    console.error('Error fetching page:', error);
                    throw error;
                }
            }
            
            return items;
        }
        if(response.data.next_page_params) {
           items = await fetchAllPages(items);
        }
              
        if (response.data && items) {
            const grouped = Object.values(items.reduce((acc, item) => {
                if (!acc[item.token_contract]) {
                    acc[item.token_contract] = {
                        contract_address: item.token_contract,
                        supports_erc: 'erc-721',
                        items: []
                    };
                }
                acc[item.token_contract].items.push(item);
                return acc;
            }, {})
        );
        console.log(grouped);
        erc_721 = grouped;
            let balance = 0;
            for (const group of grouped) {
                    const priceResponse = await getPrice(group.contract_address); // Assuming this function exists
                    const price = priceResponse.floorPriceNative;
                    const totalPrice = parseFloat(group.items.length) * price;
                    console.log(`individual: ${totalPrice}`)
                    const status = getWhaleStatus(parseFloat(group.items.length));
                    console.log("status", status.tag);
                    WhaleArray.push(status.tag);
                    balance += totalPrice;
                    console.log('balncebeingincremented', balance)
                }
                await delay(1000);
                
            console.log('erc721-balance', balance)
            nftBalance = balance;
            console.log('nftBalance', nftBalance);
            }
    }catch(error){
        console.log("Error fetching ERC-721s:", error);}
        try{
            // Define the request URL and headers
            const url = `https://seitrace.com/insights/api/v2/token/erc1155/balances?offset=0&chain_id=pacific-1&address=${address}`;
            const options = {
                method: 'GET',
                headers: {accept: 'application/json', 'x-api-key': `${sei_key}` }
            }
            // Make the API call with axios
            const response = await axios.get(url, options)
            let items;
            if(response.data && response.data.items){
                items = response.data.items;
            }
        async function fetchAllPages(items) {
            let hasNextPage = true;
            let currentParams = {
                offset: 50,
                limit: 50,
            };
            const apiUrl = `https://seitrace.com/insights/api/v2/token/erc1155/balances?limit=${currentParams.limit}&offset=${currentParams.offset}&chain_id=pacific-1&address=${address}`;
        
            while (hasNextPage) {


                try {
                    await delay(200);
                    const options = {
                        method: 'GET',
                        headers: {accept: 'application/json', 'x-api-key': `${sei_key}` }
                    }
                    const response = await axios.get(apiUrl, options);
                    items = items.concat(response.data.items);
                    if (response.data.next_page_params) {
                        currentParams.offset = response.data.next_page_params.offset;
                        currentParams.limit = response.data.next_page_params.limit;
                    } else {
                        hasNextPage = false;
                    }
                } catch (error) {
                    console.error('Error fetching page:', error);
                    throw error;
                }
            }
            return items;
        }
        if(response.data.next_page_params) {
           items = await fetchAllPages(items);
        }
            if (response.data && items) {
                const grouped = Object.values(items.reduce((acc, item) => {
                    if (!acc[item.token_contract]) {
                        acc[item.token_contract] = {
                            contract_address: item.token_contract,
                            supports_erc: 'erc-1155',
                            items: []
                        };
                    }
                    acc[item.token_contract].items.push(item);
                    return acc;
                }, {})
            );
            
            erc_1155 = grouped;
                let balance = 0;
                for (const group of grouped) {
                        const priceResponse = await getPrice(group.contract_address); // Assuming this function exists
                        const price = priceResponse.floorPriceNative;
                        const totalPrice = parseFloat(group.items.length) * price;
                        console.log(`individual: ${totalPrice}`)
                        console.log('tokens:', group.items.length)
                        const status = getWhaleStatus(parseFloat(group.items.length));
                        console.log("status", status.tag);
                        WhaleArray.push(status.tag);
                        balance += totalPrice;
                        console.log('balncebeingincremented', balance)
                    }
                    await delay(1000);
                    console.log('erc-1155 balance', balance)
                nftBalance += balance;
                console.log('nftBalance', nftBalance);
                }
                
                
        }catch(error){
            console.log("Error fetching ERC-1155s:", error);}
            const pitems = erc_721.concat(erc_1155);
            fnft = await getFirstNft(pitems, address);
        let status = '';
        if(WhaleArray){
            if(WhaleArray.find((element) => element === "KRAKEN")){
                status = "KRAKEN";
        }
        else if(WhaleArray.find((element) => element === "WHALE")){
                status = "WHALE";
        } else if(WhaleArray.find((element) => element === "SHARK")){
                status = "SHARK"
        }else if(WhaleArray.find((element) => element === "FISH")){
                status = "FISH";
        }else{ status = "PLEB"}
    }
    const mresponse = await fetchPaginatedData(address)
    console.log(mresponse)
        let nft = '';
        if(fnft != undefined){
             nft = fnft.name
        }
        else{
            nft = ""
        }
        return {nftBalance, status, nft, mresponse};
    } catch (error) {
        console.error("Error fetching NFTs:", error);
        return 0;
    }
};

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
let isProcessing = false;


client.on('messageCreate', async (msg) => {
    if (msg.content === '!Hello Seitastic') {
        msg.reply(`Hello ${msg.author.username} \nPlease input your SEI EVM address \n(Example Format: !NFT 0x...)`);
        return;
    }

    if (msg.content.startsWith('!NFT') || msg.content.startsWith('!Memecoin')) {

        if (msg.content.startsWith('!NFT')) {
            if (isProcessing) {
                msg.reply('The bot is currently handling another request. Please wait.');
                return;
            }
            msg.reply('Processing your request...');
            const array = msg.content.split(' ');
            const address = array[1];
    
            // Validate the address
            if (!address || address[0] !== '0' || address[1] !== 'x' || address.length !== 42) {
                msg.reply('No Address Specified or incorrect address inputted');
                return;
            }
    
            // Set the processing flag
            isProcessing = true;
    try{
        console.log("Received Balance Command:", msg.content);
        const response = await getNfts(address);    
        const first = address.slice(0, 4);
        const last = address.slice(-4);
        const balance = response.nftBalance
        const status = response.status;
        const fnft = response.nft;
        const volume = response.mresponse  
        if(response){
            registerFont('./Poppins-Bold.ttf', {family: 'Poppins'});
            const canvas = createCanvas(850, 480); // Adjust the size as needed
            const ctx = canvas.getContext('2d');

            const image = await loadImage('./NFT.jpg'); // Replace with your image path
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const overlayImage = await loadImage(`./${status}.png`); // Replace with your image path
            ctx.drawImage(overlayImage, 30 , 80, 150, 150);
    
    // Set text properties
    ctx.font = '25px Poppins';
    ctx.fillStyle = '#333333';
    // Draw balance under nftbalance
    ctx.fillText(`${balance} SEI`, 125, 410); // Adjust coordinates as needed

    // Draw status in rotated box above nftbalance
    ctx.save();
    ctx.translate(245, 285); // Adjust coordinates as needed
    ctx.rotate(-Math.PI / 7); // Rotate 45 degrees counter-clockwise
    ctx.fillText(`${status}`, 0, 0);
    ctx.restore();

    // Draw volume under the volume text
    ctx.fillText(`${volume} SEI`, 440, 410); // Adjust coordinates as needed
    ctx.fillText(`${first}....${last}`, 465, 330); // Adjust coordinates as needed

    // Draw fnft in the box above address that says first nft owned
    ctx.save();
    ctx.font = 'bold 20px sans-seriff';
    ctx.fillText(`${fnft || ''}`, 465, 230); // Adjust coordinates as needed
    ctx.restore();

    // Save the canvas as an image
    const buffer = canvas.toBuffer('image/png');    
    const attachment = new AttachmentBuilder(buffer, { name: 'scorecard.png' });
        msg.reply({ content: 'Here is your Scorecard:', files: [attachment] });
        
    
    }
    if(!response){
        msg.reply("Nfts not found. Error returning Nft Balance, please try again");
        return;
    }
    }catch(error){
            msg.reply("Nfts not found. Error returning Nft Balance, please try again");
            return;
        }finally {
            // Release the processing flag
            isProcessing = false;
        }
    }

    if (msg.content.startsWith('!Memecoin')) {
        console.log("Received Balance Command:", msg.content);
        const response = await getCoins(address);
        const balance = response.tokenBalance;
        const status = response.status;
        console.log(balance, status)
        if (!balance) {
            msg.reply("Coins not found. Error returning Coin Balance please try again");
            return;
        }
        msg.reply(`Value: ${balance}SEI`);
    }
    }
});

client.login(process.env.TOKEN);
