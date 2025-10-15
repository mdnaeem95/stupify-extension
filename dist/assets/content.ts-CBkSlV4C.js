var g=Object.defineProperty;var m=(n,e,i)=>e in n?g(n,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):n[e]=i;var r=(n,e,i)=>m(n,typeof e!="symbol"?e+"":e,i);import{l as t}from"./utils-BvHapBx2.js";class f{constructor(e){r(this,"minLength");r(this,"maxLength");r(this,"debounceMs");r(this,"onSelectionChange");r(this,"debounceTimer",null);r(this,"lastSelection","");r(this,"isPaused",!1);r(this,"isDestroyed",!1);r(this,"handleMouseUp",()=>{this.isPaused||this.isDestroyed||this.debounceSelectionCheck()});r(this,"handleSelectionChange",()=>{this.isPaused||this.isDestroyed||this.debounceSelectionCheck()});r(this,"handleKeyUp",e=>{this.isPaused||this.isDestroyed||e.key==="Shift"&&this.debounceSelectionCheck()});r(this,"debounceSelectionCheck",()=>{this.debounceTimer!==null&&window.clearTimeout(this.debounceTimer),this.debounceTimer=window.setTimeout(()=>{this.checkSelection(),this.debounceTimer=null},this.debounceMs)});this.minLength=e.minLength,this.maxLength=e.maxLength,this.debounceMs=e.debounceMs||300,this.onSelectionChange=e.onSelectionChange,this.init()}init(){document.addEventListener("mouseup",this.handleMouseUp),document.addEventListener("selectionchange",this.handleSelectionChange),document.addEventListener("keyup",this.handleKeyUp),t.debug("SelectionHandler initialized")}checkSelection(){try{const e=this.getSelectedText();e&&e!==this.lastSelection&&e.length>=this.minLength&&(this.lastSelection=e,this.onSelectionChange&&this.onSelectionChange(e),t.debug("Selection changed:",{length:e.length,preview:e.substring(0,50)+"..."}))}catch(e){t.error("Failed to check selection:",e)}}getSelectedText(){try{const e=window.getSelection();if(!e)return"";let i=e.toString().trim();return i.length>this.maxLength&&(i=i.substring(0,this.maxLength)),i}catch(e){return t.error("Failed to get selected text:",e),""}}getSelectionDetails(){try{const e=window.getSelection();if(!e||e.rangeCount===0)return{text:"",boundingRect:null,range:null};const i=this.getSelectedText(),s=e.getRangeAt(0),h=s.getBoundingClientRect();return{text:i,boundingRect:h,range:s}}catch(e){return t.error("Failed to get selection details:",e),{text:"",boundingRect:null,range:null}}}hasSelection(){return this.getSelectedText().length>=this.minLength}clearSelection(){try{const e=window.getSelection();e&&e.removeAllRanges(),this.lastSelection="",t.debug("Selection cleared")}catch(e){t.error("Failed to clear selection:",e)}}pause(){this.isPaused=!0,t.debug("Selection tracking paused")}resume(){this.isPaused=!1,t.debug("Selection tracking resumed")}isPausedState(){return this.isPaused}destroy(){this.debounceTimer!==null&&(window.clearTimeout(this.debounceTimer),this.debounceTimer=null),document.removeEventListener("mouseup",this.handleMouseUp),document.removeEventListener("selectionchange",this.handleSelectionChange),document.removeEventListener("keyup",this.handleKeyUp),this.lastSelection="",this.isDestroyed=!0,t.debug("SelectionHandler destroyed")}}const l=10,c=5e3,y={key:"s"};let o=null;function d(){return typeof chrome<"u"&&chrome.storage!==void 0&&chrome.storage.local!==void 0}function u(){try{t.info("Content script initializing..."),d()||t.error("chrome.storage is not available. Extension may not work correctly."),o=new f({minLength:l,maxLength:c,onSelectionChange:p}),b(),x(),E(),t.info("Content script initialized successfully")}catch(n){t.error("Failed to initialize content script:",n)}}function p(n){try{if(n.length<l){t.debug("Selection too short, ignoring");return}n.length>c&&(t.debug("Selection too long, truncating"),n=n.substring(0,c)),d()?(chrome.storage.local.set({currentSelection:{text:n,url:window.location.href,domain:window.location.hostname,timestamp:Date.now()}}).catch(e=>{t.error("Failed to store selection:",e)}),t.debug("Selection stored:",{length:n.length,domain:window.location.hostname})):t.warn("chrome.storage not available, selection not stored")}catch(e){t.error("Failed to handle selection change:",e)}}function b(){document.addEventListener("keydown",n=>{const i=navigator.platform.toUpperCase().indexOf("MAC")>=0?n.metaKey:n.ctrlKey;n.key.toLowerCase()===y.key&&i&&n.shiftKey&&(n.preventDefault(),n.stopPropagation(),S())}),t.info("Keyboard shortcut registered")}async function S(){try{const n=o==null?void 0:o.getSelectedText();if(!n||n.length<l){a("Please select at least 10 characters","warning");return}typeof chrome<"u"&&chrome.runtime?(chrome.runtime.sendMessage({type:"OPEN_SIDE_PANEL",payload:{text:n,trigger:"keyboard_shortcut"}}).catch(e=>{t.error("Failed to send message to background:",e),a("Failed to open side panel. Please try again.","error")}),chrome.runtime.sendMessage({type:"TRACK_EVENT",payload:{event:"keyboard_shortcut_used",properties:{text_length:n.length,domain:window.location.hostname}}}).catch(e=>{t.debug("Failed to track event:",e)}),t.info("Keyboard shortcut triggered")):(t.error("chrome.runtime not available"),a("Extension not available","error"))}catch(n){t.error("Failed to handle keyboard shortcut:",n),a("Something went wrong. Please try again.","error")}}function x(){typeof chrome<"u"&&chrome.runtime?(chrome.runtime.onMessage.addListener((n,e,i)=>{try{if(n.type==="CONTEXT_MENU_CLICKED"&&(w(),i({success:!0})),n.type==="GET_CURRENT_SELECTION"){const s=(o==null?void 0:o.getSelectedText())||"";i({text:s})}return!0}catch(s){return t.error("Error in message listener:",s,e),i({success:!1,error:String(s)}),!1}}),t.info("Message listener registered")):t.error("chrome.runtime not available, message listener not registered")}async function w(){try{if(!d()){t.error("chrome.storage not available"),a("Extension storage not available","error");return}const e=(await chrome.storage.local.get("currentSelection")).currentSelection;if(!e||!e.text){a("No text selected","warning");return}typeof chrome<"u"&&chrome.runtime?(chrome.runtime.sendMessage({type:"OPEN_SIDE_PANEL",payload:{text:e.text,trigger:"context_menu"}}).catch(i=>{t.error("Failed to send message to background:",i),a("Failed to open side panel. Please try again.","error")}),chrome.runtime.sendMessage({type:"TRACK_EVENT",payload:{event:"context_menu_clicked",properties:{text_length:e.text.length,domain:window.location.hostname}}}).catch(i=>{t.debug("Failed to track event:",i)}),t.info("Context menu click handled")):(t.error("chrome.runtime not available"),a("Extension not available","error"))}catch(n){t.error("Failed to handle context menu click:",n),a("Something went wrong. Please try again.","error")}}function E(){document.addEventListener("visibilitychange",()=>{document.hidden?(o==null||o.pause(),t.debug("Selection tracking paused (tab hidden)")):(o==null||o.resume(),t.debug("Selection tracking resumed (tab visible)"))})}function a(n,e){const i=document.createElement("div");if(i.className="stupify-notification",i.setAttribute("data-type",e),i.textContent=n,!document.getElementById("stupify-notification-styles")){const s=document.createElement("style");s.id="stupify-notification-styles",s.textContent=`
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
    `,document.head.appendChild(s)}document.body.appendChild(i),setTimeout(()=>{i.style.animation="stupify-slide-out 0.3s ease-in",setTimeout(()=>i.remove(),300)},3e3)}function C(){o==null||o.destroy(),t.info("Content script cleaned up")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",u):u();window.addEventListener("beforeunload",C);export{C as cleanup,w as handleContextMenuClick,p as handleSelectionChange,u as init};
