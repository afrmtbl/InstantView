const API_KEY = "AIzaSyBBdCo-KyDeWBHkR2JrGdeL7tyrMq3z1-4";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "get_video_data") {
        handleGetVideoData(request, sender, sendResponse);
    }
    else if (request.message === "get_channel_data") {
    	handleGetChannelData(request, sender, sendResponse);
    }
    else if (request.message === "get_comment_data") {
    	handleGetCommentData(request, sender, sendResponse);
    }
    return true;
});

function handleGetVideoData(request, sender, sendResponse) {
    ivlog(`getting video data: videoId=${request.videoId}`);
    const res = new Promise(async (resolve, reject) => {
        const endpoint = `https://www.googleapis.com/youtube/v3/videos`;

        try {
            const response = await ytget(endpoint, {
                id: request.videoId,
                part: "snippet,statistics",
                fields: "items(id,snippet(title,channelId,description,publishedAt),statistics(viewCount,likeCount,dislikeCount))"
            });

            if (response.items[0] && response.items[0].snippet) {
                resolve(response.items[0]);
            }
            else if (!response.items.length) {
                reject({error: new Error(`There were no videos matching the id: ${request.videoId}`)});
            }
        }
        catch(e) {
            reject({error: e});
        }
    });
    res.then(data => {
        sendResponse(data);
    }).catch(err => {
        sendResponse({error: err});
    });
}
function handleGetChannelData(request, sender, sendResponse) {
    ivlog(`getting channel data: channelId=${request.channelId}`);
    const res = new Promise(async (resolve, reject) => {

        const endpoint = `https://www.googleapis.com/youtube/v3/channels`;

        try {
            const response = await ytget(endpoint, {
                id: request.channelId,
                part: "snippet,statistics",
                fields: "items(id,snippet(title,thumbnails/default),statistics/subscriberCount)"
            });
            resolve(response.items[0]);
        }
        catch(e) {
            reject({error: e});
        }
    });
    res.then(data => {
        sendResponse(data);
    }).catch(err => {
        sendResponse({error: err});
    });
}
function handleGetCommentData(request, sender, sendResponse) {
    ivlog(`getting comment data: videoId=${request.videoId} pageToken: ${request.pageToken}`);
    const res = new Promise(async (resolve, reject) => {

        const endpoint = `https://www.googleapis.com/youtube/v3/commentThreads`;

        try {
            const field = "snippet/topLevelComment/snippet";
            const items = `items(snippet/topLevelComment/id,${field}/authorChannelUrl,${field}/authorDisplayName,${field}/textDisplay)`;

            const requestData = {
                videoId: request.videoId,
                part: "snippet",
                fields: `nextPageToken,${items}`,
                maxResults: 15,
                order: "relevance"
            };

            if (request.pageToken) {
                requestData.pageToken = request.pageToken;
            }

            const response = await ytget(endpoint, requestData);
            const comments = response.items.map(comment => {
                const data = comment.snippet.topLevelComment.snippet;
                return {
                    id: comment.snippet.topLevelComment.id,
                    videoId: request.videoId,
                    author: data.authorDisplayName,
                    authorUrl: data.authorChannelUrl,
                    text: data.textDisplay
                };
            });

            resolve({comments, nextPageToken: response.nextPageToken});
        }
        catch(e) {
            reject({error: e});
        }
    });
    res.then(data => {
        sendResponse(data);
    }).catch(err => {
        sendResponse({error: err});
    });
}

function ytget(endpoint, options, key = API_KEY) {
    return new Promise((resolve, reject) => {

        const url = new URL(endpoint);

        for (const opt in options) {
            url.searchParams.append(opt, options[opt]);
        }

        url.searchParams.append("key", key);

        fetch(url).then(response => {
            return response.json();
        }).then(data => {
            if (data.error) {
                reject("Error while retrieving data from youtube: " + data.error.message + ` (code ${data.error.code})`);
            }
            else if (data.items) {
                resolve(data);
            }
            else {
                ivlog("Error while retrieving data from youtube (ytget_e)");
                reject("Error while retrieving data from youtube");
            }
        }).catch(e => {
            ivlog(`Error while retrieving data from youtube (ytget_c): e=${e.message}`);
        });

    });
}
