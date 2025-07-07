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
  1563121109: {
    p: "$4.99",
    n: "破碎的像素地牢",
  },
};

let apps = [
  "1563121109|us", //破碎的像素地牢
]; //app跟踪id
let reg = "cn"; //默认区域：美国us 中国cn 香港hk
let app_infos = [];
try {
  const con = importModule("Config");
  apps = con.apps();
  reg = con.reg();
  if (apps == [] || reg == "") {
    throw new Error(err);
  }
} catch (err) {
  if (apps == "" || reg == "") {
    log("请检查脚本内填入的App监控信息是否完整");
  }
}

!(async () => {
  await format_apps(apps);
  log(app_infos);
  let widget = await createWidget(app_infos);
  Script.setWidget(widget);
  Script.complete();
})().catch((err) => {
  log("运行出现错误\n" + err);
});

async function createWidget(app_infos) {
  const w = new ListWidget();
  w.setPadding(10, 10, 10, 10);

  const mainStack = w.addStack();
  mainStack.layoutHorizontally();
  mainStack.centerAlignContent();

  // Left stack for text content
  const leftStack = mainStack.addStack();
  leftStack.layoutVertically();
  leftStack.spacing = 5;

  leftStack.addSpacer(); // Add spacer to push content down

  //打折排到最前
  app_infos.sort((a, b) => {
    if (a.is_sale === b.is_sale) {
      // 当 is_sale 相同时，按 content 字典序排序
      return a.content.localeCompare(b.content);
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
    selectedApp.content = `> ${selectedApp.content}`;
  }

  for (const element of app_infos) {
    addTextToListWidget(element, leftStack);
  }

  leftStack.addSpacer();

  // If an app was selected, add its image to the right
  if (selectedApp) {
    mainStack.addSpacer();

    const rightStack = mainStack.addStack();
    rightStack.layoutVertically();
    rightStack.addSpacer(5);

    try {
      const screenshotUrls = selectedApp.screenshotUrls;
      const randomScreenshotUrl =
        screenshotUrls[Math.floor(Math.random() * screenshotUrls.length)];
      const imgReq = new Request(randomScreenshotUrl);
      const img = await imgReq.loadImage();
      const imgWidget = rightStack.addImage(img);
      imgWidget.cornerRadius = 8;
      const imageWidth = 120;
      imgWidget.imageSize = new Size(
        imageWidth,
        img.size.height * (imageWidth / img.size.width)
      );
    } catch (e) {
      console.log("Error loading image: " + e);
    }
    rightStack.addSpacer(5);
  }

  w.presentMedium();
  return w;
}

function addTextToListWidget(app_info, listWidget) {
  let text = app_info.content;
  const stack = listWidget.addStack();
  stack.setPadding(2, 15, 2, 15);

  let item = stack.addText(text);
  if (app_info.is_sale) {
    item.textColor = new Color("006400");
    item.font = Font.boldSystemFont(12);
  } else {
    item.font = Font.systemFont(12);
  }
}

function addTitleTextToListWidget(text, listWidget) {
  const titleStack = listWidget.addStack();
  let item = titleStack.addText(text);
  try {
    item.applyHeadlineTextStyling();
  } catch (e) {
    item.font = Font.systemFont(11);
  }
  item.textOpacity = 0.7;
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
    await Promise.all(
      Object.keys(d).map(async (k) => {
        let url = "https://itunes.apple.com/lookup?id=" + d[k] + "&country=" + k;
        const req = new Request(url);
        try {
          const responseBody = await req.loadString();
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
                        content: `${app_name} | ${app_price}(${app_monitor[x.trackId].p
                          })`,
                        screenshotUrls: x.screenshotUrls,
                        is_sale: true,
                      });
                    }
                  }
                }
                if (!is_sale) {
                  app_infos.push({
                    content: `${app_name} | ${app_price}`,
                    screenshotUrls: x.screenshotUrls,
                    is_sale: false,
                  });
                }
              });
            }
        } catch (e) {
            console.log(e);
        }
            
      })
    );
    return app_infos;
  } catch (e) {
    console.log(e);
  }
}