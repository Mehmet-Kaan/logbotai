// const apiURL = "https://logbotai-backend.onrender.com/";
// const apiURL = "http://localhost:8080/";
// let authorizationToken = "logbotai";

// const saveToQuerry = (element, attributes) => {
//     fetch(apiURL+"/postToQuerry", {
//       method: "POST", // *GET, POST, PUT, DELETE, etc.
//       // mode: "cors", // no-cors, *cors, same-origin
//       headers: {
//         "Content-Type": "application/json", 
//         "Authorization": `${authorizationToken}`
//       },
//       body: JSON.stringify({
//         data: "Clicked: " + element,
//         attributes: attributes
//       }), // body data type must match "Content-Type" header
//     })
// }

// //Function to get data from bigquerry
// const getFromQuerry = async (wantedData) => {

//   try {
//     const response = await fetch(apiURL + `/getFromQuerry?wantedData=${wantedData}`, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": authorizationToken
//       }
//     });

//     if (response.ok) {
//       const data = await response.json();
//       console.log(data);
//     } else {
//       console.error("Request failed with status:", response.status);
//     }
//   } catch (error) {
//     console.error("An error occurred:", error);
//   }
// };

//Calculates the tokens that will be send to ai
const calculateTokens = (conversations, question) => {

  let currentConversation = [
    {
      role: "user",
      content: question,
    }
  ]
 
  // Iterate through the sorted conversations and format them for the conversation array
  conversations.forEach((item) => {
    currentConversation.push(
      {
        role: "system",
        content: item.Response,
      },
      {
        role: "user",
        content: item.Title,
      },
    )
  });

  // currentConversation.push(
  //   {
  //     "role": "system",
  //     "content": "Alright!",
  //   },
  //   {
  //     "role": "user",
  //     "content": `Act as Gandalf from the Lord of the Rings analyzing the idea only by wearing the ${selectedGandalf} hat from the six thinkings hat. Do not reveal that you're Gandalf and wearing any hat. Please do not mention any explanation about thinking hats neither in your response.`,
  //   }
  // )

  // let sortedArray = currentConversation.sort((a, b) => b - a);
  // console.log(sortedArray);
  console.log(currentConversation);
    return currentConversation;
}

const getNewID = (id) => {
  let newId = parseInt(id) + 1;
  return JSON.stringify(newId);
  }

// export default (saveToQuerry, getFromQuerry, calculateTokens);
export default (calculateTokens, getNewID);