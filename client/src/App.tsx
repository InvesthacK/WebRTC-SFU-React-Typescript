import React, { useState } from "react";
import { io } from "socket.io-client";
import Room from "./Room";
import ShareScreen from "./ShareScreen";
import Test from "./Test";

interface RoomProps {
  children?: React.ReactNode;
}

const mediaSetting = {
  video: true,
};

export const socket = io(import.meta.env.VITE_SERVER, {
  reconnection: false,
  secure: true,
  transports: ["polling"],
});

interface IGlobalContext {
  screenId: string;
  setScreenId: React.Dispatch<React.SetStateAction<string>>;
}

export const GlobalContext = React.createContext<IGlobalContext>({
  screenId: "",
  setScreenId: () => {},
});

const App: React.FC<RoomProps> = ({ children }) => {
  const [media, setMedia] = useState<MediaStream | null>(null);
  const [type, setType] = useState<"camera" | "screen">("screen");
  const [shareScreen, setShareScreen] = useState(false);
  const [screenId, setScreenId] = useState("");
  const [test, setTest] = useState(false);

  const getStream = (type: "screen" | "camera") => {
    setType(type);
    switch (type) {
      case "camera":
        navigator.mediaDevices.getUserMedia(mediaSetting).then((media) => {
          setMedia(media);
        });
        break;

      case "screen":
        navigator.mediaDevices.getDisplayMedia().then((media) => {
          setMedia(media);
        });
        break;
      default:
        break;
    }
  };
  return (
    <GlobalContext.Provider value={{ screenId, setScreenId }}>
      {/* {type === "camera" && (
        <>
          <button
            onClick={() => {
              setShareScreen(true);
            }}
          >
            Screen Sharing
          </button>
        </>
      )}
      {media ? (
        <>
          <Room media={media} />
          {shareScreen && (
            <>
              <ShareScreen />
            </>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => {
              getStream("camera");
            }}
          >
            Use Camera
          </button>
          <button
            onClick={() => {
              getStream("screen");
            }}
          >
            Share Screen
          </button>
        </>
      )} */}
      <button
        onClick={() => {
          getStream("camera");
          setTest(true);
        }}
      >
        Test Here
      </button>
      {test && media && <Test media={media} />}
    </GlobalContext.Provider>
  );
};
export default App;
