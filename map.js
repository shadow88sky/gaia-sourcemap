// ==UserScript==
// @name         gaia-sourcemap
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  auto match sourcemap
// @author       chen
// @match        https://kibana.gaiaworkforce.com/*
// @match        https://kibanatest.gaiaworkforce.com/*
// @grant        GM_xmlhttpRequest
// @require    http://libs.baidu.com/jquery/2.1.4/jquery.min.js
// @require    https://unpkg.com/source-map@0.7.3/dist/source-map.js
// ==/UserScript==

(function() {
    'use strict';
    sourceMap.SourceMapConsumer.initialize({
            "lib/mappings.wasm": "https://unpkg.com/source-map@0.7.3/lib/mappings.wasm"
    });
    function isJsonString(str){
       try{
          if(typeof JSON.parse(str) == 'object'){
             return true;
          }
       }catch(e){}
       return false;
    }
    $(document).on('mouseup', 'td > button',async(e)=>{
        // 正则
        const reg = /https:\/\/[\w|.|/|\d|-]*:\d*:\d*/g
        const urlReg = /https:\/\/[\w|.|/|\d|-]*/
        // 取当前button的tr
        let tr = $(e.currentTarget).parents('tr');
        let expandedTr = tr.next('tr');
        // 如果该tr是展开的document，则继续下面操作
        if(expandedTr.attr('class')!=='kbnDocTableDetails__row') return;
        setTimeout(()=>{
            const span = expandedTr.find('td[title=remark]').next('td').find('span');
            // 不存在remark的span，则返回
            if(!span || span.length<1) return;
            const innerHtml = span[0].innerHTML;
            // 不存在js路径，则返回
            if(!reg.test(innerHtml)) return;
            const sourceList = innerHtml.match(reg);
            const mapResult = [];
            for(let i=0;i<sourceList.length;i++){
                const url = sourceList[i].match(urlReg)[0];
                const lineCol = sourceList[i].replace(urlReg,'');
                const lineColList = lineCol.split(':');
                GM_xmlhttpRequest({
                    type:'get',
                    synchronous:true,
                    url: url,
                    onload: response=>{
                        const sourceMapMatch = response.responseText.match(/sourceMappingURL=[\w|\d|.]*/);
                        const sourcePath = sourceMapMatch && sourceMapMatch.length>0 ? url.substring(0,url.lastIndexOf('/') + 1) + sourceMapMatch[0].split('=')[1] : '';
                        if(!sourcePath) return;
                        GM_xmlhttpRequest({
                           type:'get',
                           synchronous:true,
                           url: sourcePath,
                           onload: responseMap=>{
                               if(!isJsonString(responseMap.responseText)) return;
                               sourceMap.SourceMapConsumer.with(responseMap.responseText, null, consumer => {
                                  const result = consumer.originalPositionFor({
                                      source: url,
                                      line: +lineColList[1],
                                      column: +lineColList[2]
                                  });
                                  span[0].innerHTML = span[0].innerHTML.replace(sourceList[i],sourceList[i] + `<br/> <span style="background-color:#fffd38">source:${result.source},line:${result.line},col:${result.column},name:${result.name}</span>`)
                              });
                           },
                           onerror:(body,status)=>{
                           }
                        })
                    },
                    onerror:(body,status)=>{
                    }
                })
            }
      },0)
    })
})();
