// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: tag;
/*
 * Author: evilbutcher 修改自t.me/QuanXApp群友分享
 * Github: https://github.com/evilbutcher
 */
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

const DEFAULT_COUNTRY_CODE = "us";

const app_monitor = {
  // originalPrice: 监控价格，当真实价格与该价格不相等时进行折扣展示
  // alias: 别名展示，可选
  // country: 区域代码，可选，默认为 "cn"
  //一个强大且美观的macOS桌面效率神器
  6751482006: {
    country: "cn",
    originalPrice: "¥38.00"
  }
};
let app_infos = [];

!(async () => {
  await format_apps();
  
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

  // 只显示前4条数据
  app_infos = app_infos.slice(0, 4);

  // Find apps with screenshots and select one randomly
  const appsWithScreenshots = app_infos.filter(
    (app) => app.screenshotUrls && app.screenshotUrls.length > 0
  );
  let selectedApp = null;
  if (appsWithScreenshots.length > 0) {
    selectedApp =
      appsWithScreenshots[Math.floor(Math.random() * appsWithScreenshots.length)];
    // Mark the selected app
    selectedApp.name = `→${selectedApp.name}`;
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

    const maxImageWidth = 220;
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
  textStack.size = new Size(100, maxStackHeight);
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
  price.textColor = Color.gray();
  
  let priceFontSize = 9;
  let nameFontSize = 11;
  if (app_info.is_sale) {
    price.font = Font.systemFont(priceFontSize);
    name.font = Font.boldSystemFont(nameFontSize);
  } else {
    price.font = Font.systemFont(priceFontSize);
    name.font = Font.boldSystemFont(nameFontSize);
  }

  // Apply color based on price change status
  if (app_info.priceChangeStatus === 'decrease') {
    price.textColor = Color.green();
    name.textColor = Color.green();
  } else if (app_info.priceChangeStatus === 'increase') {
    price.textColor = Color.red();
    name.textColor = Color.red();
  }
}

function parsePrice(priceString) {
  if (!priceString) return null;
  // Remove currency symbols, commas, and other non-numeric characters except for the decimal point
  const numericString = priceString.replace(/[^0-9.]/g, '');
  return parseFloat(numericString);
}

async function format_apps() {
  let apps_f = {};
  for (const appId in app_monitor) {
    if (app_monitor.hasOwnProperty(appId)) {
      const appInfo = app_monitor[appId];
      const countryCode = appInfo.country || DEFAULT_COUNTRY_CODE;
      if (countryCode) {
        if (!apps_f[countryCode]) {
          apps_f[countryCode] = [];
        }
        apps_f[countryCode].push(appId);
      } else {
        app_infos.push({ content: `应用 ${appId} 缺少国家代码` });
      }
    }
  }
  if (Object.keys(apps_f).length > 0) {
    await post_data(apps_f);
  }
}

async function post_data(d) {
  try {
    // Function to clear expired cache files
    const clearExpiredCache = async () => {
      const fm = FileManager.iCloud();
      const cacheDirectory = fm.joinPath(fm.documentsDirectory(), "cache/App Price Monitor");
      if (fm.fileExists(cacheDirectory)) {
        try {
          const files = fm.listContents(cacheDirectory);
          const now = new Date().getTime();

          for (const file of files) {
            const filePath = fm.joinPath(cacheDirectory, file);
            if (!fm.isDirectory(filePath)) {
              const modificationDate = fm.modificationDate(filePath).getTime();
              if (now - modificationDate > CACHE_DURATION) {
                console.log(`Deleting expired cache file: ${file}`);
                fm.remove(filePath);
              }
            }
          }
        } catch (e) {
          console.log(`Error clearing cache: ${e}`);
        }
      }
    };

    await clearExpiredCache(); // Call the cache clearing function

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

              // Check cache first
              if (fm.fileExists(cacheFilePath)) {
                const modificationDate = fm.modificationDate(cacheFilePath).getTime();
                if (now - modificationDate < CACHE_DURATION) {
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

                    let app_name = app_monitor_data.alias;
                    if (!app_name) {
                      app_name = x.trackName;
                    }
                    let app_price = x.formattedPrice;
                    let priceChangeStatus = 'no_change';

                    const currentPriceValue = parsePrice(app_price);
                    const originalPriceValue = parsePrice(app_monitor_data.originalPrice);

                    if (currentPriceValue !== null && originalPriceValue !== null) {
                      if (currentPriceValue < originalPriceValue) {
                        priceChangeStatus = 'decrease';
                      } else if (currentPriceValue > originalPriceValue) {
                        priceChangeStatus = 'increase';
                      }
                    }

                    infos[x.trackId] = {
                      alias: app_name,
                      originalPrice: app_price,
                    };
                    if (app_monitor.hasOwnProperty(x.trackId)) {
                      if (
                        JSON.stringify(app_monitor[x.trackId]) !==
                        JSON.stringify(infos[x.trackId])
                      ) {
                        if (app_price !== app_monitor[x.trackId].originalPrice) {
                          is_sale = true;
                          app_infos.push({
                            name: `${app_name}`,
                            price: `${app_price}(${app_monitor[x.trackId].originalPrice})`,
                            screenshotUrls: x.screenshotUrls,
                            is_sale: true,
                            priceChangeStatus: priceChangeStatus,
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
                        priceChangeStatus: priceChangeStatus,
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