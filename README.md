# CIS-566-2018-final-project-GabeRobinson-Barr

Final Writeup

As of this submission there is no github pages link. I dont know why but its giving me an error: "Your site is having problems building: The variable {{a} on line 50 in node_modules/balanced-match/README.md was not properly closed with }}. For more information, see https://help.github.com/articles/page-build-failed-tag-not-properly-terminated/." So I'm going to work on that for presentation day.


Summary

This is a beatmap game similar to one like "Osu" where a player clicks beats along to a song. I made this for my final project because finding beatmaps to good songs is often a hassle. I wanted to be able to choose any song and create a game that would procedurally generate the beatmap so that I wouldn't have to download a new map for every song I wanted to play.


How to play the game

The game works by either selecting a preloaded song in the dropdown menu, hitting 'GetSongLocation' which will load the location of the song into SongLocation, and then hit load song to load the audio file into the program. It may take anywhere from 3-10 seconds depending on the size of the audio file, just wait a bit and then hit 'Play/Pause' to start the game. There is typically about a 6-10 second delay on the game starting so don't worry if it doesn't start up immediately. Alternatively if you have an mp3 file you want to use to play the game, you can specify the file location by typing in SongLocation. Due to how the file request is set up the easiest way to do this is to copy the mp3 into the 'Audio' folder in the program's top level folder, and type: ../../Audio/SONGNAME.mp3 into SongLocation, where SONGNAME is replaced by the name of the song file. Just make sure that if you are going to copy an mp3 into the Audio folder you reload the program after doing so otherwise it won't work.

Volume and the Play/Pause button are pretty self explanatory.

Playing the game is fairly simple. As the circles or "beats" appear there will be a blue ring closing on the beat. When the ring hits the outer part of the beat you want to click inside the circle. There is a bit of leeway, so you can click a bit before or after the ring hits the beat and you will still get points for it, however the less precise you are the fewer points you get. The exact amount of leeway you have is shown by 'BufferTime' in the gui. Increasing it will make the game much easier, and lowering it will make it harder.
The 'Difficulty' slider determines how often the game can generate beats, at high difficulties it will generate beats very quickly making it harder to hit them all.
When you correctly hit a beat by clicking inside the circle within the buffertime you get a certain amount of points. If you miss a beat by either misclicking outside the circle, or mistiming your click you will lose points. In addition, each time you click the next beat that was meant to be clicked will dissappear, so don't double click to try and get it after a miss. The game can also generate slides instead of beats. This is pretty uncommon because of how the tone analysis algorithm works but can occur when the algorithm detects longer tones. I didn't quite get around to implementing the scoring for slides properly (or fixing a strange bug where a slide can get rendered in the bottom left corner for no reason), so you can pretend they work by dragging your mouse along the slide in time with the blue circle that will appear to show you how fast to slide, but it won't actually affect your score either way. Your score will update as the game goes by.
Don't worry about closing the gui when playing, I made sure that beats shouldn't spawn under the gui, and clicking in the gui doesn't count as a misclick.


How it works/Implementation

Using Three.js's Audio API loadscene constructs a node graph that connects the audio file to the audio output. It also delays the playing of the audio to 6 seconds after it analyses it so that the program can properly generate beats without worrying about generating them too slowly for the player to click on them or to render them.
The tone analysis algorithm used is a way of analyzing fast fourier transforms for tones found at https://github.com/cwilso/PitchDetect I just used this implementation since for this project I don't have the time or the expertise to know how it actually works. It tends to work better with strong clean tones like whistling and piano notes, but picks up changes in tones reasonably well for this purpose.
Each tick the current tone is ran through the algorithm, and beats or slides are generated based on whether tones are the same or different. There are also a few more rules that deal with placement, and how often you can generate beats. After generating a new beat, the Analysis class passes all the beats that within 1 second of disappearing to main and then to the shader to render the beats on the screen. Everything rendered on the screen is written in the beatmap fragment shader. Beats are passed as vec3s in the format (x, y, remainingtime) and the shader uses those values to determine whether a fragment should be a beat, a ring, a slide or the background. Slides are treated as a pair of successive vec3s where the first one is formatted as (-1, slideshape, starttime) and the second is (startx, starty, endtime). The shader takes care of the path based on these values.
While the program is running, if the player clicks on the screen (but not on the gui), it passes the click location to the Analyser which updates the score based on whether it is a hit or a miss.
Thats basically it, structure wise this program is fairly straight forward, most of the confusing parts are in Analyser's generateBeat() because that function has all the rules about how to generate the beats, and the way the shader handles slides and interprets their shapes is a bit confusing.

Enjoy playing!