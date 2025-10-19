'use strict';
const { encodeURL } = require('hexo-util');

const pathFn = require('path');
const urljoin = require('url-join');


function getCdnConfig(ctx) {
    var cdnConfig = null;
    if (typeof (ctx.config.jsdelivr_cdn) !== 'undefined') {
        cdnConfig = ctx.config.jsdelivr_cdn;
    }
    return cdnConfig;
}

function removeLastSlash(s) {
    if (s.length === 0)
        return s;
    if (s[s.length - 1] === '/')
        return s.substring(0, s.length - 1);
    return s;
}
function isAbsolutePath(p) {
    return /^https?:\/\//i.test(p);
}
/**
 * 生成最终图片 URL
 * @param {string} imgPath - 原始图片路径（相对或绝对）
 * @param {string} assetDir - 文章资源目录 basename
 * @param {string} cdnPrefix - CDN 或前缀 URL
 * @returns {string} - 拼接后的图片 URL，已编码
 */
function getFinalImageUrl(hexo, data,cdnPrefix, assetDir, imgPath) {
    // 本地调试
    if (hexo.env.debug) {
        return urljoin("http://localhost:4000/posts", data.abbrlink, pathFn.basename(imgPath));
    }
    // 如果 imgPath 已经包含 assetDir，则只拼接 CDN 前缀
    if (imgPath.includes(assetDir)) {
        return urljoin(cdnPrefix, imgPath);
    } else {
        // 否则拼接 assetDir + imgPath
        return urljoin(cdnPrefix, assetDir, imgPath);
    }
}
// replace all asset_img tag with html img tag
function processPost(data) {
    const hexoInstance = this; // this 指向 Hexo
    let cdnConfig = getCdnConfig(this);
    // const postAssetDirName = "post-assets";
    const postAssetDirName = "_posts";
    // var reg = /!\[(.*)\]\((.*)\)/g;: ", data.source, " full_source: ", data.full_source);
    if (typeof data.asset_dir !== "undefined" && typeof this.config !== "undefined") {
        if (!this.config.post_asset_folder) {
            throw new TypeError("post_asset_folder in _config.yml must be set true to use cdn-jsdelivr");
        }
        // let cdnUrlPrefix = removeLastSlash(cdnConfig.cdn_url_prefix) + "@latest"
        let cdnUrlPrefix = removeLastSlash(cdnConfig.cdn_url_prefix)
        let postUrlPrefix = urljoin(cdnUrlPrefix, postAssetDirName);
        // let imgTagReg = /{%\s*asset_img\s+([^%\s]+)\s+([^%]*)%?}/g;
        // data.content = data.content.replace(imgTagReg, "<img src=\"" + urljoin(postUrlPrefix, pathFn.basename(data.asset_dir), '$1') + "\" alt=\"" + "$2" + "\">");

        // 先替换 HTML 格式的图片 <img src="img.png" />
        let imgHtmlReg = /<img\s+src="([^"]+)"\s*[^>]*>/g;
        data.content = data.content.replace(imgHtmlReg, (match, imgPath) => {
            if (isAbsolutePath(imgPath)) {
                return match;
            }
            // 拼接完整的 CDN 图片 URL
            let imgUrl = getFinalImageUrl(hexoInstance,data,postUrlPrefix, pathFn.basename(data.asset_dir), imgPath);
            // 返回替换后的原始标签，只替换链接部分
            return match.replace(imgPath, encodeURL(imgUrl)); // 只替换 src 部分
        });

        // 然后替换 Markdown 格式的图片 ![alt](img.png)
        let imgMarkdownReg = /!\[([^\]]*)\]\(([^)]+)\)/g;
        data.content = data.content.replace(imgMarkdownReg, (match, altText, imgPath) => {
            if (isAbsolutePath(imgPath)) {
                return match;
            }
            // 拼接完整的 CDN 图片 URL
            let imgUrl = getFinalImageUrl(hexoInstance,data,postUrlPrefix, pathFn.basename(data.asset_dir), imgPath);
            // 返回替换后的原始标签，只替换链接部分
            return match.replace(imgPath, encodeURL(imgUrl)); // 只替换 src 部分
        });

        // 正则表达式匹配 {% image 链接 %} 或 {% inlineImg [src] %} 格式
        let imgTagReg = /{%\s*(image|inlineImg)\s*([^\s,]*).*%}/g;

        data.content = data.content.replace(imgTagReg, (match, type, src) => {
            // 如果是绝对路径，返回原始标签
            if (isAbsolutePath(src)) {
                return match;
            }

            // 拼接完整的 CDN 图片 URL
            let imgUrl = getFinalImageUrl(hexoInstance,data,postUrlPrefix, pathFn.basename(data.asset_dir), src);

            // 返回替换后的原始标签，只替换链接部分
            return match.replace(src, encodeURL(imgUrl)); // 只替换 src 部分
        });




        // 检查并修改 Front-matter 中的 cover 参数
        if (data.cover && !isAbsolutePath(data.cover)) {
            // 如果 cover 是相对路径，则替换为 CDN 路径
            data.cover = getFinalImageUrl(hexoInstance,data,postUrlPrefix, pathFn.basename(data.asset_dir), data.cover);
        }
    }
    return data;
}



module.exports.processPost = processPost;

module.exports.getCdnConfig = getCdnConfig;