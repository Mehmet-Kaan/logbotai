// import React, { useEffect, useState } from "react";

// const TypingMessage = ({ text, speed = 30 }) => {
//   const [displayedText, setDisplayedText] = useState("");

//   useEffect(() => {
//     let i = 0;
//     const interval = setInterval(() => {
//       setDisplayedText((prev) => prev + text[i]);
//       i++;
//       if (i >= text.length) clearInterval(interval);
//     }, speed);

//     return () => clearInterval(interval);
//   }, [text, speed]);

//   return (
//     <span>
//       {displayedText}
//       {displayedText.length < text.length && <span className="typing-cursor" />}
//     </span>
//   );
// };

// export default TypingMessage;

import React, { useEffect, useRef, useState } from "react";

const TypingMessage = ({ text, speed = 20 }) => {
  const [displayedText, setDisplayedText] = useState("");
  const messageRef = useRef(null);

  useEffect(() => {
    let i = 0;
    setDisplayedText(""); // reset if new text comes in
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  // 👇 Auto-scroll whenever displayedText updates
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayedText]);

  return (
    <span ref={messageRef}>
      {displayedText}
    </span>
  );
};

export default TypingMessage;