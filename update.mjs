import { getHistoricalRates } from 'dukascopy-node';
import { mkdir, writeFile } from 'node:fs/promises';
const pairs = ['AUDCAD','AUDCHF','AUDJPY','AUDNZD','AUDUSD','CADCHF','CADJPY','CHFJPY','EURAUD','EURCAD','EURCHF','EURGBP','EURJPY','EURNZD','EURUSD','GBPAUD','GBPCAD','GBPCHF','GBPJPY','GBPNZD','GBPUSD','NZDCAD','NZDCHF','NZDJPY','NZDUSD','USDCAD','USDCHF','USDJPY'];
const from = process.env.FROM_DATE || '2026-10-23';
const to = new Date(); to.setUTCHours(0,0,0,0); // exclusive end: today; omit today's unfinished candle
const until = to.toISOString().slice(0,10);
await mkdir('updated-prices',{recursive:true});
const status=[];
for (const pair of pairs) {
  try {
    const data = await getHistoricalRates({instrument:pair.toLowerCase(), dates:{from,to:until}, timeframe:'d1',format:'json',priceType:'bid',volumes:false,requestIntervalMs:150});
    const rows=data.filter(x=>Number.isFinite(x.close)&&Number.isFinite(x.open)&&Number.isFinite(x.high)&&Number.isFinite(x.low)).sort((a,b)=>a.timestamp-b.timestamp);
    const csv=['date,open,high,low,close',...rows.map(x=>[new Date(x.timestamp).toISOString().slice(0,10),x.open,x.high,x.low,x.close].join(','))].join('\n')+'\n';
    await writeFile(`updated-prices/${pair}.csv`,csv);
    status.push({pair,count:rows.length,first:rows[0]?.timestamp,last:rows.at(-1)?.timestamp,status:rows.length?'ok':'empty'});
    console.log(pair,rows.length);
  } catch(e) {status.push({pair,status:'ERROR',error:String(e)}); console.error(pair,e.message);}
}
await writeFile('updated-prices/status.json',JSON.stringify({from,until,status},null,2));
if(status.some(x=>x.status!=='ok'))process.exitCode=1;
