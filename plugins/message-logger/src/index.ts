import { findByName, findByProps } from "@vendetta/metro";
import { FluxDispatcher, ReactNative } from "@vendetta/metro/common";
import { after, before, instead } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";

const patches = [];
const ChannelMessages = findByProps("_channelMessages");
const MessageRecordUtils = findByProps("updateMessageRecord", "createMessageRecord");
const MessageRecord = findByName("MessageRecord", false);
const RowManager = findByName("RowManager");
const SelectedChannelStore = findByProps("getChannelId");

const VENCORD_RED = "#ed4245";
const VENCORD_BG = "#ed424515"; 


const processColor = ReactNative.processColor;


patches.push(before("dispatch", FluxDispatcher, ([event]) => {
  if (event.type === "MESSAGE_DELETE") {
    if (event.__vml_cleanup) return event;
    
    // Only log active channel to prevent Native Crashes
    if (event.channelId !== SelectedChannelStore.getChannelId()) return event;

    const channel = ChannelMessages.get(event.channelId);
    const message = channel?.get(event.id);

    if (!message || message.state === "SEND_FAILED") return event;

    return [{
      type: "MESSAGE_UPDATE",
      message: {
        ...message.toJS(),
        __vml_deleted: true,
      },
    }];
  }
}));

patches.push(instead("updateMessageRecord", MessageRecordUtils, function ([oldRecord, newRecord], orig) {
  if (newRecord.__vml_deleted) {
    const record = MessageRecordUtils.createMessageRecord(newRecord, oldRecord.reactions);
    record.__vml_deleted = true;
    return record;
  }
  return orig.apply(this, [oldRecord, newRecord]);
}));

patches.push(after("createMessageRecord", MessageRecordUtils, function ([message], record) {
  if (message.__vml_deleted) record.__vml_deleted = true;
}));



patches.push(after("generate", RowManager.prototype, ([data], row) => {

  if (data.rowType !== 1) return; 

  if (data.message.__vml_deleted) {
    

    if (row.message.timestampLabel && !row.message.timestampLabel.includes("deleted")) {
       row.message.timestampLabel += " • (deleted)";
    }

    row.backgroundHighlight = {
      backgroundColor: processColor(VENCORD_BG), 
      gutterColor: processColor(VENCORD_RED),     
    };


    row.message.avatarOpacity = 0.6;
    row.message.usernameOpacity = 0.6;


  }
}));


export const onUnload = () => {
  patches.forEach((unpatch) => unpatch());
};

export const settings = {};
