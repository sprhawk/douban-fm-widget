var WIDGET_VERSION = "0.9.10";

var APP_VERSION = 90;
var APP_NAME = "radio_desktop_mac";
var TOKEN = "token";
var EXPIRE = "expire";
var USER_ID = "userid";
var USER_NAME = "username";

var LAST_CHANNEL_ID = "last_channel_id";
var LAST_CHANNEL_NAME = "last_channel_name";

var DISABLE_GROWL = "disable_growl";

var LAST_CHECK_VERSION_DATE = "last check version date";
var LATEST_VERSION = "latest version";

var CHANNEL_ID = "channel_id";
var CHANNEL_NAME = "name";
var SONG_LIKE = "like";

var PAUSED = 'paused';
var PLAYING = 'playing';

var FAVOURITE_CHANNEL = {"channel_id":-3, "name":"红心"};
var PERSONAL_CHANNEL = {"channel_id":0, "name":"私人"};
var CHINESE_CHANNEL = {"channel_id":1, "name":"华语"};

var _songs = null;
var _currentSong = null;
var _currentChannel = PERSONAL_CHANNEL;
//var _currentChannel = FAVOURITE_CHANNEL;

var _lastUpdatedChannelDate = null;

var _imageData = null;

var _useGrowl = true;

var _channels = {
            0:PERSONAL_CHANNEL,
            "-3":FAVOURITE_CHANNEL,
            1:CHINESE_CHANNEL,
        };
        
var _token = null;
var _username = null;
var _expire = null;
var _userid = null;

var _playerState = PAUSED;

function getBaseParameter()
{
    var base = "version="+APP_VERSION+"&app_name="+APP_NAME;
    return base;
}

function getFullParameter()
{
    var base = getBaseParameter();
    if (!_token && window.widget) {
        _token = widget.preferenceForKey(TOKEN);
        _userid = widget.preferenceForKey(USER_ID);
        _username = widget.preferenceForKey(USER_NAME);
        _expire = widget.preferenceForKey(EXPIRE);
    }
    if(_token && _expire) {
        base += "&token="+_token+"&expire="+_expire+"&user_id="+_userid;
    }
    return base;
}

function getPlayer()
{
    if (window.DoubanfmPlugin && window.DoubanfmPlugin.play instanceof Function) {
        return window.DoubanfmPlugin;
    }
    return document.getElementById('main_audio');
}

function getTitleElement()
{
    return document.getElementById('title');
}
function getArtistElement()
{
    return document.getElementById('artist');
}  

function getTimeElement()
{
    return document.getElementById('time');
}

function getPlayAndPauseBox()
{
    var box = document.getElementById("playAndPauseBox");
    return box;
}

function checkVersion(version)
{
    var remote_numbers = version.split(".");
    var current_numbers = WIDGET_VERSION.split(".");
    
    var need_update = false;
    var len = remote_numbers.length > 3?remote_numbers.length:3;
    for(var i = 0; i < len; i ++) {
        if (parseInt(remote_numbers[i]) > parseInt(current_numbers[i])) {
            need_update = true;
            break;
        }
    }
    
    if(need_update) {
        var a = document.getElementById("new_version_anchor");
        document.getElementById("new_version").style.display="block";
        a.innerHTML = version;
        a.href = "http://www.yang.me/";
        if(window.widget) {
            a.onclick = function() {widget.openURL(ret['link']?ret['link']:"http://w.yang.me/");};
            widget.setPreferenceForKey(version, LATEST_VERSION);
        }
    }
    else {
        document.getElementById("new_version").style.display="none";
    }
}

function updateVersion()
{
    if(window.widget) {
        var dateString = widget.preferenceForKey(LAST_CHECK_VERSION_DATE);
        if (dateString) {
            var lastTime = Date.parse(dateString);
            if (Date.now() - lastTime < 60 * 60 * 1) 
                {
                var version =  widget.preferenceForKey(LATEST_VERSION);
                if (version) {
                    checkVersion(version);
                    return ;
                }
                }
        }
    }
    
    var url = 'http://w.yang.me/dbfm';
    var request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    request.onreadystatechange = function() {
        if (4 == request.readyState) {
            responseType = request.getResponseHeader('Content-Type');
            if('application/json' == responseType.substr(0,16)) {
                ret = JSON.parse(request.responseText);
                var version = ret['version'];
                if ("string" == typeof version) {
                    checkVersion(version);
                    if(window.widget) {
                        var dateString = new Date();
                        widget.setPreferenceForKey(dateString.toString(), LAST_CHECK_VERSION_DATE);
                    }
                }
            }
        }
    }
    var body = null;
    body = {"version":WIDGET_VERSION};
    if (_userid) {
        body["userid"] = _userid;
    }
    body = JSON.stringify(body);
    request.send(body);
}

function initializePlayAndPauseButton()
{
    onMouseOutPlayAndPause();
    var front = document.getElementById('front');
    front.addEventListener("mouseover", onFrontMouseOver, true);
    front.addEventListener("mouseout", onFrontMouseOut, true);
    var box = getPlayAndPauseBox();
    box.style.webkitTransitionDuration = "2s";
    box.style.opacity = 0;
}

function initializePlayer()
{
    
    getTimeElement().innerHTML = '';
    getTitleElement().innerHTML = '';
    getArtistElement().innerHTML = '';
    var player = getPlayer();
    player.addEventListener('progress', onProgress, false);
    player.addEventListener('ended', onEnded, false);
    player.addEventListener('timeupdate', onTimeUpdate, false);    
   _playerState = PAUSED;
    _currentSong = null;
}

function initializeDoubanfm()
{
    initializePlayer();
    
    initializePlayAndPauseButton();
    
    loadChannellist();
    
    onLogin();
    
    var lastChannelId = null;
    var lastChannelName = null;
    
    if(window.widget) {
        var disable = widget.preferenceForKey(DISABLE_GROWL);
        if (disable) {
            _useGrowl = false;
        }
        else {
            _useGrowl = true;
        }
        
        var elem = document.getElementById("enable_growl");
        elem.checked = _useGrowl;
        
        lastChannelId = widget.preferenceForKey(LAST_CHANNEL_ID);
        lastChannelName = widget.preferenceForKey(LAST_CHANNEL_NAME);
    }
    var channel = {};
    
    if(!lastChannelId) {
        lastChannelId = CHINESE_CHANNEL[CHANNEL_ID];
        lastChannelName = CHINESE_CHANNEL[CHANNEL_NAME];
    }
    channel[CHANNEL_NAME] = lastChannelName;
    channel[CHANNEL_ID] = lastChannelId;
    
    
    var versionElem = document.getElementById("version");
    versionElem.innerHTML = WIDGET_VERSION + "";
    
    onChangeChannel(channel, false);
    
    window.addEventListener("keydown", function(e) {
                                if(13 == e.keyCode) {
                                    onClickLogin();
                                }
                            }, true);
                            
    updateVersion();
}

function clearDoubanfm()
{
    if(window.widget) {
        widget.setPreferenceForKey(null, USER_ID);
        widget.setPreferenceForKey(null, USER_NAME);
        widget.setPreferenceForKey(null, TOKEN);
        widget.setPreferenceForKey(null, EXPIRE);
    }
}

function onCheckGrowl()
{
    var elem = document.getElementById("enable_growl");
    _useGrowl = elem.checked;
    if(window.widget) {
        widget.setPreferenceForKey(!_useGrowl, DISABLE_GROWL);
    }
    
    var growlelem = document.getElementById("growl");
/*    if(_useGrowl) {
        growlelem.style.color = "white";
    }
    else {
        growlelem.style.color = "gray";
    }
*/
}

function setLike(isLike)
{
    var like = document.getElementById('DC_img1');
    if (isLike) {
        like.src = 'doubanfm/like_02.png';
    }
    else {
        like.src = 'doubanfm/like_01.png';
    }
}

function onProgress(e)
{
    var player = getPlayer();
//    console.log(parseInt((player.buffered.end(0)/player.duration) * 100));

}

function onEnded(e)
{
    console.log('onEnded');
    initializePlayer();
    playNextSong();
}

function onTimeUpdate(e)
{
    var player = getPlayer();
//    console.log('time:' + parseInt(player.currentTime));
    var currentTime = parseInt(player.currentTime);
    var duration = parseInt(player.duration);
    var left = duration - currentTime;
    var time = getTimeElement();
    
    var leftMin = parseInt(left/60);
    var leftSec = parseInt(left - leftMin * 60);
    var elapsedMin = parseInt(currentTime / 60);
    var elapsedSec = parseInt(currentTime - elapsedMin * 60);
    time.innerText =  (elapsedMin<10?'0':'') + elapsedMin + ':' + (elapsedSec<10?'0':'') + elapsedSec + '/-' + (leftMin<10?'0':'') + leftMin + ':' + (leftSec<10?'0':'') + leftSec;
}


function onFrontMouseOver(event)
{
    var box = getPlayAndPauseBox();
    box.style.webkitTransitionDuration = "3s";
    box.style.opacity = 1.0;
}

function onFrontMouseOut(event)
{
    var box = getPlayAndPauseBox();
    box.style.webkitTransitionDuration = "0.5s";
    box.style.opacity = 0.0;
}


function onMouseOverPlayAndPause()
{
    if (_playerState == PAUSED) {
        setPlayIcon();
    }
    else {
        setPauseIcon();
    }
}

function onMouseOutPlayAndPause()
{
    if (_playerState == PAUSED) {
        setPauseIcon();
    }
    else {
        setPlayIcon();
    }
}

function onPlayOrPause()
{
    if (_playerState == PAUSED) 
    {
        if(_currentSong)
        {
            getPlayer().play();
            _playerState = PLAYING;
        }
        else 
        {
            playNextSong();
        }
        setPauseIcon();
    }
    else
    {
        getPlayer().pause();
        _playerState = PAUSED;
        setPlayIcon();
    }
}

function onMarkFavourite()
{
    if(!_currentSong) return;
    
    if (0 == _currentSong[SONG_LIKE]) {
        _currentSong[SONG_LIKE] = 1;
        loadSonglist('r', _currentChannel[CHANNEL_ID], _currentSong['sid']);
        setLike(true);
        
        if (_useGrowl) {
                window.DoubanfmPlugin.growlNotify("为《"+_currentSong['title']+"》加了红心", "Douban fm", _imageData);
        }
    }
    else {
        _currentSong[SONG_LIKE] = 0;
        loadSonglist('u', _currentChannel[CHANNEL_ID], _currentSong['sid']);
        setLike(false);
        if (_useGrowl) {
                window.DoubanfmPlugin.growlNotify("为《"+_currentSong['title']+"》取消红心", "Douban fm", _imageData);
        }
    }
}

function onBan()
{
    var channel_id = _currentChannel[CHANNEL_ID];
    if("t" == _currentSong["subtype"] || "T" == _currentSong["subtype"]) return ;
    
    if (_currentSong && 0 == channel_id || -3 == channel_id) {
        getPlayer().pause();
        loadSonglist('b', _currentChannel[CHANNEL_ID], _currentSong['sid']);
        initializePlayer();
    }
}

function onSkip()
{
    if(!_currentSong) {playNextSong();return;}
    
    if("t" == _currentSong["subtype"] || "T" == _currentSong["subtype"]) return ;
    
    getPlayer().pause();
    loadSonglist('s', _currentChannel[CHANNEL_ID], _currentSong['sid']);
    initializePlayer();
}

function setPauseIcon()
{
    var canvasElem = document.getElementById('canvas_play_pause');
    var ctx = canvasElem.getContext('2d');
    var height = canvasElem.height;
    var width = canvasElem.width;
//    ctx.fillStyle="rgb(200, 200, 200)";
//    ctx.fillRect(0,0,width,height);
    ctx.clearRect(0,0,width,height);
    var barWidth = width/5;
    var padding = 10;
    ctx.fillStyle="gray";
    ctx.fillRect(barWidth, 0+padding, barWidth, height-2*padding);
    ctx.fillRect(barWidth * 3, 0+padding, barWidth, height-2*padding);
}
function setPlayIcon()
{
    var canvasElem = document.getElementById('canvas_play_pause');
    var ctx = canvasElem.getContext('2d');
    var height = canvasElem.height;
    var width = canvasElem.width;
    
//    ctx.fillStyle="rgb(200, 200, 200)";
//    ctx.fillRect(0,0,width,height);
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = "gray";
    ctx.beginPath();
    var padding = 20;
    ctx.moveTo(0+padding,0+padding);
    ctx.lineTo(width-padding, height / 2);
    ctx.lineTo(0+padding, height-padding);
    ctx.closePath();
    ctx.fill();
}


function onLoadChannellist(channels)
{
    if (undefined !== channels && null !== channels)
    {
        /* reset channels */
        
        _channels = {
            0:PERSONAL_CHANNEL,
            "-3":FAVOURITE_CHANNEL,
            1:CHINESE_CHANNEL,
        };
        
        channels = channels["public"];
        var public_channels = document.getElementById("public_channels");
        public_channels.innerHTML = "";

        var overall_width = 0;
//        var original_display = document.getElementById("channellist").style.display;
//        document.getElementById("channellist").style.display="block";
        Object.keys(channels).forEach(function(item){
            var category = channels[item];
            
            var cate_group = document.createElement("div");
            cate_group.className = "channel_cate_group";
            public_channels.appendChild(cate_group);

            var cate_label = document.createElement("div");
            cate_label.className = "channel_cate";
            cate_label.innerHTML = category["cate"];
            cate_group.appendChild(cate_label);
            
            var list = document.createElement("ul");
            list.className = "channel_list";
            cate_group.appendChild(list);

            var sub_channels = category["channels"];
            Object.keys(sub_channels).forEach(function(channel_item){
                var channel = sub_channels[channel_item];
                var channel_id = channel["channel_id"];
                _channels[channel_id] = channel;
                var channel_name = channel["name"];
                
                var li = document.createElement("li");
                li.className = "channel";
                li.setAttribute("channel_id", channel_id);
                li.setAttribute("channel_name", channel_name);
                li.setAttribute("onclick", "onClickChannel(this)");
                li.innerHTML = channel_name;
                list.appendChild(li);
            });
            
            var width = cate_group.offsetWidth;
            overall_width += width + 18;
            
            _lastUpdatedChannelDate = new Date();
        });
        
        var personal = document.getElementById("personal_channels");
        overall_width += personal.offsetWidth;
        
        var scrolls = document.getElementById("channels_scroll");
        scrolls.style.width = overall_width + "px";
        
    }
    
//    document.getElementById("channellist").style.display=original_display;
}

function loadChannellist()
{
    var url = 'http://www.douban.com/j/app/radio/channels?cate=y&' + getFullParameter();
    var request = new XMLHttpRequest();
    request.open("GET", url);
    request.onreadystatechange = function() {
        if (4 == request.readyState) {
            responseType = request.getResponseHeader('Content-Type');
            if('application/json' == responseType.substr(0,16)) {
                ret = JSON.parse(request.responseText);
                if (!ret['err']) {
                    onLoadChannellist(ret);
                }
                else {
                    console.log('error:' + request.responseText);
                }
            }
        }
    }
    request.send();
}


function loadSonglist(type, channel_id, sid)
{
    type = undefined === type?'n':type;
    channel = undefined === channel_id?0:channel_id;

    var request = new XMLHttpRequest();
    
    var url = "http://www.douban.com/j/app/radio/people?"+getFullParameter()+"&type="+type+"&channel="+channel_id;
    if(undefined !== sid)
    {
        url += '&sid=' + sid;
    }
//    console.log('url:' + url);
    request.open("GET", url);
    _songs = undefined;
    request.setRequestHeader("Cache-Control", "no-cache");
    request.onreadystatechange = function() {
        if (4 == request.readyState) {
            responseType = request.getResponseHeader('Content-Type');
            if('application/json' == responseType.substr(0,16)) {
                ret = JSON.parse(request.responseText);
                if (0 == ret['r']) {
                    playSongsFromInfo(ret['song']);
                }
                else {
                    console.log('error:' + request.responseText);
                }
            }
        }
    };
    request.send();
}


function playSongsFromInfo(songsInfo)
{
    _songs = songsInfo;
    if(!_currentSong) {
        playNextSong();
    }
}

function playNextSong()
{
    if (_songs && _songs.length > 0)
    {
        _currentSong = _songs.shift();

        var player = getPlayer();
        player.src = _currentSong['url'];
        player.play();
        _playerState = PLAYING;
        
        var img = document.createElement("img");
        var url = _currentSong['picture'];
        url = url.replace('mpic', 'lpic');         img.onload = function() {
            var canvasElem = document.createElement("canvas");
            var width = img.width
            var height = img.height
            canvasElem.width = width;
            canvasElem.height = height;
            
            var canvas = canvasElem.getContext('2d');
            canvas.drawImage(img, 0, 0);
            _imageData = canvas.getImageData(0, 0, width, height);
            if (_useGrowl) {
                window.DoubanfmPlugin.growlNotify("正在播放:《"+_currentSong['title']+"》", "Douban fm", _imageData);
            }
            var old = document.getElementById('DC_img');
            var parent = old.parentElement;
            parent.removeChild(old);
            img.id = "DC_img";
            parent.appendChild(img);
        }
        img.src = url;
        
        var title = getTitleElement();
        title.innerHTML = _currentSong['title'];
        var artist = getArtistElement();
        artist.innerHTML = _currentSong['artist'];
        var isLike = parseInt(_currentSong['like']);
        setLike(isLike);
        
        updateVersion();
    }
    else
    {
        loadSonglist('n', _currentChannel[CHANNEL_ID]);
    }
}


//Events handlers

function onClickLike(event)
{
    if (_currentSong) 
    {
        if(parseInt(_currentSong['like']))
        {
            _currentSong['like'] = '0';
            setLike(false);
        }
        else 
        {
            _currentSong['like'] = '1';
            setLike(true);
        }
    }
}

function onClickLogin()
{
    var request = new XMLHttpRequest();
    
    var url = "https://www.douban.com/j/app/login?"+getBaseParameter();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    if (0 == username.length)
    {
        return ;
    }
    if (0 == password.legnth) 
    {
        return ;
    }
//    console.log('url:' + url);
    request.open("POST", url);

    request.setRequestHeader("Cache-Control", "no-cache");
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    var body;
    
    if (-1 == username.indexOf('@')) {
        body = "username="+encodeURIComponent(username)+"&password="+encodeURIComponent(password);
    }
    else {
        body = "email="+encodeURIComponent(username)+"&password="+encodeURIComponent(password);
    }
    request.onreadystatechange = function() {
        if (4 == request.readyState) {
//            console.log('login:'+request.responseText);
            responseType = request.getResponseHeader('Content-Type');
            if('application/json' == responseType.substr(0,16)) {
                ret = JSON.parse(request.responseText);
                if (0 == ret['r']) {
                    _userid = ret["user_id"];
                    _username = ret["user_name"];
                    _token = ret["token"];
                    _expire = ret["expire"];
                    if (window.widget && _userid && _token && _expire) {
                        widget.setPreferenceForKey(_userid, USER_ID);
                        if (_username) {
                            widget.setPreferenceForKey(_username, USER_NAME);
                        }
                        widget.setPreferenceForKey(_token, TOKEN);
                        widget.setPreferenceForKey(_expire, EXPIRE);
                        onLogin();
                    }
                }
                else {
                    console.log('error:' + request.responseText);
                }
            }
        }
    };
    request.send(body);
}

function onLogin()
{
    if(window.widget) {
        _userid = widget.preferenceForKey(USER_ID);
        _username = widget.preferenceForKey(USER_NAME);
        _token = widget.preferenceForKey(TOKEN);
        _expire = widget.preferenceForKey(EXPIRE);
    }
    if(_token) {
        var loginItemsElem = document.getElementById('login_items');
        loginItemsElem.style.webkitTransition="-webkit-transform 10s, opacity 2s";
        loginItemsElem.style.opacity = 0.0;
        loginItemsElem.style.webkitTransform = "translateX(-200px)";
        
        var nicknameElem = document.getElementById('nickname');
        nicknameElem.removeAttribute('hidden');
        nicknameElem.style.opacity = 1.0;
        nicknameElem.style.webkitTransition="-webkit-transform 10s, opacity 2s";
        //nicknameElem.style.webkitTransform = "translateX(-200px)";
        nicknameElem.innerHTML = _username;
    }
    else {
        document.getElementById('nickname').setAttribute('hidden');
    }
}

function beginBubbleRectPath(context, width, height, radius, angleOffset, angleWidth, angleHeight)
{
    context.beginPath();
    context.moveTo(radius, 0);
    context.lineTo(width-radius,0);//upper
    context.arcTo(width,0, width, radius, radius);//upper-right
    context.lineTo(width,height-radius);//right
    context.arcTo(width, height, width-radius,height, radius);//-bottom
    context.lineTo(angleOffset + angleWidth/2, height);
    context.lineTo(angleOffset, height + angleHeight);
    context.lineTo(angleOffset-angleWidth/2, height);
    context.lineTo(radius,height);//botom
    context.arcTo(0, height, 0, height-radius, radius);//right-bottom;
    context.lineTo(0, radius);
    context.arcTo(0, 0, width-radius, 0, radius);
}

var channellist_on_show = false;
function onClickShowChannel()
{
    if (!channellist_on_show) 
    {
        var canvas = document.getElementById('canvas_channellist');
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        beginBubbleRectPath(ctx, width, height, 10, 10, 10);
        var gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgb(100,100,100)');
        gradient.addColorStop(1, 'rgb(0,0,0)');
        ctx.fillStyle = gradient;
        ctx.globalAlpha=0.8;
        ctx.fill();
        
        var channellist = document.getElementById("channellist");
        channellist.style.webkitAnimationName = "channellist_out";
        channellist.style.display = "block";
        channellist_on_show = true;
        
        var now = new Date();
        if (!_lastUpdatedChannelDate || now - _lastUpdatedChannelDate > 60 * 60 * 24) {
            loadChannellist();
        }
    }
    else {
        channellist_on_show = false;
        var channellist = document.getElementById("channellist");
        
        channellist.addEventListener("webkitAnimationEnd", function(e){
            if(false == channellist_on_show) {
                channellist.style.display = "none";
            }
        }, false);

        channellist.style.webkitAnimationName = "channellist_in";
    }
}

function onClickChannel(elem) {     var channelId = elem.getAttribute("channel_id");
    var channel = _channels[channelId];
    
    onChangeChannel(channel);

    onClickShowChannel();
}

function onChangeChannel(channel, autostart)
{
    if (channel)
    { 
        if(channel[CHANNEL_ID] > 0 || _token) 
        {
            _currentChannel = channel;
        }
        else {
            showBack();
            return ;
        }
    }
    else {
        _currentChannel = CHINESE_CHANNEL;
    }
    
    var channel_id = _currentChannel[CHANNEL_ID];
    var channel_name = _currentChannel[CHANNEL_NAME];
    
    var channelElem = document.getElementById("channel");
    channelElem.innerHTML = channel_name;
    if(window.widget) {
        widget.setPreferenceForKey(channel_id, LAST_CHANNEL_ID);
        widget.setPreferenceForKey(channel_name, LAST_CHANNEL_NAME);
    }
    
    var hate = document.getElementById("hate");
    if (channel_id > 0) {
        hate.style.opacity = 0.5;
    }
    else {
        hate.style.opacity = 1.0;
    }
    
    if (false != autostart) {
        loadSonglist('n', channel_id);
        getPlayer().pause();
        initializePlayer();
    }
}