var h=Object.defineProperty;var g=(t,e,i)=>e in t?h(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var s=(t,e,i)=>g(t,typeof e!="symbol"?e+"":e,i);import{l as n}from"./utils-BvHapBx2.js";class m{constructor(e){s(this,"minLength");s(this,"maxLength");s(this,"debounceMs");s(this,"onSelectionChange");s(this,"debounceTimer",null);s(this,"lastSelection","");s(this,"isPaused",!1);s(this,"isDestroyed",!1);s(this,"handleMouseUp",()=>{this.isPaused||this.isDestroyed||this.debounceSelectionCheck()});s(this,"handleSelectionChange",()=>{this.isPaused||this.isDestroyed||this.debounceSelectionCheck()});s(this,"handleKeyUp",e=>{this.isPaused||this.isDestroyed||e.key==="Shift"&&this.debounceSelectionCheck()});s(this,"debounceSelectionCheck",()=>{this.debounceTimer!==null&&window.clearTimeout(this.debounceTimer),this.debounceTimer=window.setTimeout(()=>{this.checkSelection(),this.debounceTimer=null},this.debounceMs)});this.minLength=e.minLength,this.maxLength=e.maxLength,this.debounceMs=e.debounceMs||300,this.onSelectionChange=e.onSelectionChange,this.init()}init(){document.addEventListener("mouseup",this.handleMouseUp),document.addEventListener("selectionchange",this.handleSelectionChange),document.addEventListener("keyup",this.handleKeyUp),n.debug("SelectionHandler initialized")}checkSelection(){try{const e=this.getSelectedText();e&&e!==this.lastSelection&&e.length>=this.minLength&&(this.lastSelection=e,this.onSelectionChange&&this.onSelectionChange(e),n.debug("Selection changed:",{length:e.length,preview:e.substring(0,50)+"..."}))}catch(e){n.error("Failed to check selection:",e)}}getSelectedText(){try{const e=window.getSelection();if(!e)return"";let i=e.toString().trim();return i.length>this.maxLength&&(i=i.substring(0,this.maxLength)),i}catch(e){return n.error("Failed to get selected text:",e),""}}getSelectionDetails(){try{const e=window.getSelection();if(!e||e.rangeCount===0)return{text:"",boundingRect:null,range:null};const i=this.getSelectedText(),r=e.getRangeAt(0),u=r.getBoundingClientRect();return{text:i,boundingRect:u,range:r}}catch(e){return n.error("Failed to get selection details:",e),{text:"",boundingRect:null,range:null}}}hasSelection(){return this.getSelectedText().length>=this.minLength}clearSelection(){try{const e=window.getSelection();e&&e.removeAllRanges(),this.lastSelection="",n.debug("Selection cleared")}catch(e){n.error("Failed to clear selection:",e)}}pause(){this.isPaused=!0,n.debug("Selection tracking paused")}resume(){this.isPaused=!1,n.debug("Selection tracking resumed")}isPausedState(){return this.isPaused}destroy(){this.debounceTimer!==null&&(window.clearTimeout(this.debounceTimer),this.debounceTimer=null),document.removeEventListener("mouseup",this.handleMouseUp),document.removeEventListener("selectionchange",this.handleSelectionChange),document.removeEventListener("keyup",this.handleKeyUp),this.lastSelection="",this.isDestroyed=!0,n.debug("SelectionHandler destroyed")}}const l=10,c=5e3,f={key:"s"};let o=null;function d(){try{n.info("Content script initializing..."),o=new m({minLength:l,maxLength:c,onSelectionChange:y}),p(),b(),w(),n.info("Content script initialized successfully")}catch(t){n.error("Failed to initialize content script:",t)}}function y(t){if(t.length<l){n.debug("Selection too short, ignoring");return}t.length>c&&(n.debug("Selection too long, truncating"),t=t.substring(0,c)),chrome.storage.local.set({currentSelection:{text:t,url:window.location.href,domain:window.location.hostname,timestamp:Date.now()}}),n.debug("Selection stored:",{length:t.length,domain:window.location.hostname})}function p(){document.addEventListener("keydown",t=>{const i=navigator.platform.toUpperCase().indexOf("MAC")>=0?t.metaKey:t.ctrlKey;t.key.toLowerCase()===f.key&&i&&t.shiftKey&&(t.preventDefault(),t.stopPropagation(),S())}),n.info("Keyboard shortcut registered")}async function S(){try{const t=o==null?void 0:o.getSelectedText();if(!t||t.length<l){a("Please select at least 10 characters","warning");return}chrome.runtime.sendMessage({type:"OPEN_SIDE_PANEL",payload:{text:t,trigger:"keyboard_shortcut"}}),chrome.runtime.sendMessage({type:"TRACK_EVENT",payload:{event:"keyboard_shortcut_used",properties:{text_length:t.length,domain:window.location.hostname}}}),n.info("Keyboard shortcut triggered")}catch(t){n.error("Failed to handle keyboard shortcut:",t),a("Something went wrong. Please try again.","error")}}function b(){chrome.runtime.onMessage.addListener((t,e,i)=>{if(t.type==="CONTEXT_MENU_CLICKED"&&(x(),i({success:!0})),t.type==="GET_CURRENT_SELECTION"){const r=(o==null?void 0:o.getSelectedText())||"";i({text:r})}return console.log(e),!0}),n.info("Message listener registered")}async function x(){try{const e=(await chrome.storage.local.get("currentSelection")).currentSelection;if(!e||!e.text){a("No text selected","warning");return}chrome.runtime.sendMessage({type:"OPEN_SIDE_PANEL",payload:{text:e.text,trigger:"context_menu"}}),chrome.runtime.sendMessage({type:"TRACK_EVENT",payload:{event:"context_menu_clicked",properties:{text_length:e.text.length,domain:window.location.hostname}}}),n.info("Context menu click handled")}catch(t){n.error("Failed to handle context menu click:",t),a("Something went wrong. Please try again.","error")}}function w(){document.addEventListener("visibilitychange",()=>{document.hidden?(o==null||o.pause(),n.debug("Selection tracking paused (tab hidden)")):(o==null||o.resume(),n.debug("Selection tracking resumed (tab visible)"))})}function a(t,e){const i=document.createElement("div");if(i.className="stupify-notification",i.setAttribute("data-type",e),i.textContent=t,!document.getElementById("stupify-notification-styles")){const r=document.createElement("style");r.id="stupify-notification-styles",r.textContent=`
      .stupify-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
        animation: stupify-slide-in 0.3s ease-out;
      }

      .stupify-notification[data-type="success"] {
        background: #10b981;
        color: white;
      }

      .stupify-notification[data-type="warning"] {
        background: #f59e0b;
        color: white;
      }

      .stupify-notification[data-type="error"] {
        background: #ef4444;
        color: white;
      }

      @keyframes stupify-slide-in {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes stupify-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `,document.head.appendChild(r)}document.body.appendChild(i),setTimeout(()=>{i.style.animation="stupify-slide-out 0.3s ease-in",setTimeout(()=>i.remove(),300)},3e3)}function C(){o==null||o.destroy(),n.info("Content script cleaned up")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d();window.addEventListener("beforeunload",C);export{C as cleanup,x as handleContextMenuClick,y as handleSelectionChange,d as init};
