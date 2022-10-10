// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
  setInterval(async () => {
    const response = await fetch(
      `https://billets.cfmontreal.com/info//showshop.eventInventory3?params=c4d6a3d9-96fd-40b4-a549-819993354366_CFM2220IND_[object%20Object]`,
      {
        headers: {
          accept: 'application/json',
          'accept-language': 'en,fr;q=0.9',
          'content-type': 'application/json-rpc',
          'sec-ch-ua':
            '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Linux"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          Referer: 'https://billets.cfmontreal.com/cfm/',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: `{"jsonrpc":"2.0","method":"showshop.eventInventory3","params":["c4d6a3d9-96fd-40b4-a549-819993354366","CFM2220IND",{"groupByPriceLevel":true,"groupByRestriction":true,"includeKilledSeats":true}],"id":1}`,
        method: 'POST',
      }
    );
    const data = await response.json();
    console.log(data.result.primary['Unrestricted-imp'].GASeats);
  }, 5000);
})();
