import React, { useEffect, useState } from "react";

interface MessageProps {
  children?: React.ReactNode;
  dataChannel: RTCDataChannel;
}

const Message: React.FC<MessageProps> = ({ dataChannel }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    dataChannel.onmessage = (e) => {
      console.log("%c eeeeeeeeeeeeeeee", "background: red; color:white");
      const data = JSON.parse(e.data);
      setMessages((prev) => [...prev, data.data.msg]);
    };
  }, []);

  return (
    <>
      <div>
        {messages.map((m, i) => {
          return <div key={i}>{m}</div>;
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          dataChannel.send(
            JSON.stringify({
              type: "msg",
              data: { msg: input },
            })
          );
          setInput("");
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.currentTarget.value);
          }}
        />
        <input type="submit" value="Send" />
      </form>
    </>
  );
};
export default Message;
