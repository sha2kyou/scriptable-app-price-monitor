// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: tag;
/*
 * Author: evilbutcher 修改自t.me/QuanXApp群友分享
 * Github: https://github.com/evilbutcher
 */
const app_monitor = {
  // p: 监控价格，当真实价格与该价格不相等时进行折扣展示
  // n: 别名展示，可选
  1528199331: {
    p: "$9.99",
    n: "崩溃大陆2",
  },
  1514329124: {
    p: "$2.99",
    n: "铁锈战争",
  },
  554937499: {
    p: "$0.99",
  },
  935216956: {
    p: "$4.99",
  },
  6746273626: {
    n: "Dory",
    p: "¥28.00"
  }
};

let apps = [
  "1528199331", //崩溃大陆2
  "1514329124", //铁锈战争
  "935216956", //Papers, Please
//   "554937499", //Earn to die
  "6746273626|cn", //Dory
]; //app跟踪id
let reg = "us"; //默认区域：美国us 中国cn 香港hk
let app_infos = [];

!(async () => {
  await format_apps(apps);
  
  let widget = await createWidget(app_infos);
  Script.setWidget(widget);
  Script.complete();
})().catch((err) => {
  log("运行出现错误\n" + err);
});

async function createWidget(app_infos) {
  const w = new ListWidget();
  w.setPadding(0, 5, 0, 5);

  const mainStack = w.addStack();
  mainStack.layoutHorizontally();
  

  //打折排到最前
  app_infos.sort((a, b) => {
    if (a.is_sale === b.is_sale) {
      // 当 is_sale 相同时，按 content 字典序排序
      return a.name.localeCompare(b.name);
    }
    // is_sale 为 true 的排在前面
    return b.is_sale - a.is_sale;
  });

  // Find apps with screenshots and select one randomly
  const appsWithScreenshots = app_infos.filter(
    (app) => app.screenshotUrls && app.screenshotUrls.length > 0
  );
  let selectedApp = null;
  if (appsWithScreenshots.length > 0) {
    selectedApp =
      appsWithScreenshots[Math.floor(Math.random() * appsWithScreenshots.length)];
    // Mark the selected app
    selectedApp.name = `[x]${selectedApp.name}`;
  }
  app_infos.forEach(app => {
    if (app !== selectedApp) {
      app.name = `${app.name}`;
      app.content = `${app.content}`;
    }
  });

  const maxStackHeight = 160;
  // If an app was selected, add its image to the left
  if (selectedApp) {
    const imageStackGroup = mainStack.addStack();
    imageStackGroup.layoutHorizontally();
    imageStackGroup.addSpacer();
    
    const imageStack = imageStackGroup.addStack();
    imageStack.layoutVertically();
    imageStack.addSpacer();

    const maxImageWidth = 200;
    const maxImageHeight = maxStackHeight;
    imageStackGroup.size = new Size(maxImageWidth, maxImageHeight); // Set fixed size for the image container

    try {
      const screenshotUrls = selectedApp.screenshotUrls;
      const randomScreenshotUrl =
        screenshotUrls[Math.floor(Math.random() * screenshotUrls.length)];
      const imgReq = new Request(randomScreenshotUrl);
      const img = await imgReq.loadImage();
      const imgWidget = imageStack.addImage(img);
      imgWidget.cornerRadius = 8;
      // 根据 maxImageWidth 计算缩放后的高度
      let scaledHeight = img.size.height * (maxImageWidth / img.size.width);

      if (scaledHeight > maxImageHeight) {
      // 若高度超限，按高度重新计算宽度
        const scaledWidth = img.size.width * (maxImageHeight / img.size.height);
        imageStackGroup.imageSize = new Size(scaledWidth, maxImageHeight);
      } else {
      // 正常按 maxImageWidth 设置
        imageStackGroup.imageSize = new Size(maxImageWidth, scaledHeight);
      }
    } catch (e) {
      console.log("Error loading image: " + e);
    }
    imageStack.addSpacer();
    imageStackGroup.addSpacer();
  }

  // Right stack for text content
  const textStack = mainStack.addStack();
  textStack.size = new Size(120, maxStackHeight);
  textStack.layoutVertically();
  textStack.addSpacer()
  for (const element of app_infos) {
    addTextToListWidget(element, textStack);
  }
  textStack.addSpacer();
  
  mainStack.addSpacer(); // Add this spacer to push content to the left
  w.presentMedium();
  return w;
}

function addTextToListWidget(app_info, listWidget) {
  const nameStack = listWidget.addStack();
  nameStack.setPadding(1, 5, 1, 5);
  let name = nameStack.addText(app_info.name);
  const priceStack = listWidget.addStack();
  priceStack.setPadding(1, 5, 1, 5);
  let price = priceStack.addText(app_info.price)
  
  let priceFontSize = 9;
  let nameFontSize = 10;
  if (app_info.is_sale) {
    price.textColor = Color.green();
    name.textColor = Color.green();
    price.font = Font.boldSystemFont(priceFontSize);
    name.font = Font.boldSystemFont(nameFontSize);
  } else {
    price.textColor = Color.gray();
    price.font = Font.systemFont(priceFontSize);
    name.font = Font.boldSystemFont(nameFontSize);
  }
}

async function format_apps(x) {
  let apps_f = {};
  x.forEach((n) => {
    if (/^[a-zA-Z0-9:/|\-_\s]{1,}$/.test(n)) {
      n = n.replace(/[/|\-_\s]/g, ":");
      let n_n = n.split(":");
      if (n_n.length === 1) {
        if (apps_f.hasOwnProperty(reg)) {
          apps_f[reg].push(n_n);
        } else {
          apps_f[reg] = [];
          apps_f[reg].push(n_n[0]);
        }
      } else if (n_n.length === 2) {
        if (apps_f.hasOwnProperty(n_n[1])) {
          apps_f[n_n[1]].push(n_n[0]);
        } else {
          apps_f[n_n[1]] = [];
          apps_f[n_n[1]].push(n_n[0]);
        }
      } else {
        app_infos.push({ content: `ID格式错误:【${n}】` });
      }
    } else {
      app_infos.push({ content: `ID格式错误:【${n}】` });
    }
  });
  if (Object.keys(apps_f).length > 0) {
    await post_data(apps_f);
  }
}

async function post_data(d) {
  try {
    let infos = {};
    const allRequests = [];

    // Cache setup
    const fm = FileManager.iCloud();
    const cacheDirectory = fm.joinPath(fm.documentsDirectory(), "cache/App Price Monitor");
    if (!fm.fileExists(cacheDirectory)) {
      fm.createDirectory(cacheDirectory);
    }

    for (const countryCode in d) {
      if (d.hasOwnProperty(countryCode)) {
        const appIds = d[countryCode];
        for (const appId of appIds) {
          const cacheFileName = `${appId}_${countryCode}.json`;
          const cacheFilePath = fm.joinPath(cacheDirectory, cacheFileName);

          allRequests.push(
            (async () => {
              let responseBody;
              const now = new Date().getTime();
              const threeHours = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

              // Check cache first
              if (fm.fileExists(cacheFilePath)) {
                const modificationDate = fm.modificationDate(cacheFilePath).getTime();
                if (now - modificationDate < threeHours) {
                  console.log(`Reading from cache: ${cacheFileName}`);
                  responseBody = fm.readString(cacheFilePath);
                } else {
                  console.log(`Cache expired, fetching from network: ${appId} in ${countryCode}`);
                  const url = `https://itunes.apple.com/lookup?id=${appId}&country=${countryCode}`;
                  const req = new Request(url);
                  try {
                    responseBody = await req.loadString();
                    // Write to cache
                    fm.writeString(cacheFilePath, responseBody);
                  } catch (e) {
                    console.log(`Error fetching ${url}: ${e}`);
                    return; // Skip processing if fetch fails
                  }
                }
              } else {
                console.log(`Fetching from network (no cache): ${appId} in ${countryCode}`);
                const url = `https://itunes.apple.com/lookup?id=${appId}&country=${countryCode}`;
                const req = new Request(url);
                try {
                  responseBody = await req.loadString();
                  // Write to cache
                  fm.writeString(cacheFilePath, responseBody);
                } catch (e) {
                  console.log(`Error fetching ${url}: ${e}`);
                  return; // Skip processing if fetch fails
                }
              }

              try {
                let results = JSON.parse(responseBody).results;
                if (Array.isArray(results) && results.length > 0) {
                  results.forEach((x) => {
                    let is_sale = false;
                    let app_monitor_data = app_monitor[x.trackId];
                    if (!app_monitor_data) {
                      app_monitor_data = {};
                    }

                    let app_name = app_monitor_data.n;
                    if (!app_name) {
                      app_name = x.trackName;
                    }
                    let app_price = x.formattedPrice;

                    infos[x.trackId] = {
                      n: app_name,
                      p: app_price,
                    };
                    if (app_monitor.hasOwnProperty(x.trackId)) {
                      if (
                        JSON.stringify(app_monitor[x.trackId]) !==
                        JSON.stringify(infos[x.trackId])
                      ) {
                        if (app_price !== app_monitor[x.trackId].p) {
                          is_sale = true;
                          app_infos.push({
                            name: `${app_name}`,
                            price: `${app_price}(${app_monitor[x.trackId].p})`,
                            screenshotUrls: x.screenshotUrls,
                            is_sale: true,
                          });
                        }
                      }
                    }
                    if (!is_sale) {
                      app_infos.push({
                        name: `${app_name}`,
                        price: `${app_price}`,
                        screenshotUrls: x.screenshotUrls,
                        is_sale: false,
                      });
                    }
                  });
                }
              } catch (e) {
                console.log(`Error parsing or processing data for ${appId} in ${countryCode}: ${e}`);
              }
            })()
          );
        }
      }
    }
    await Promise.all(allRequests);
    return app_infos;
  } catch (e) {
    console.log(e);
  }
}