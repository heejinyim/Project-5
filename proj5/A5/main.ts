interface OnclickHandler{
	(x:number, y:number): void ;
}

interface UpdateHandler{
	(): void;
}

interface HttpPostCallback {
	(x:any): any;
}

let nName:string;
let id_to_sprites: Record<string, Sprite> = {};
let g_scroll_x = 0;
let g_scroll_y = 0;

const thing_names = [
	"chair", // 0
	"lamp",
	"mushroom", // 2
	"outhouse",
	"pillar", // 4
	"pond",
	"rock", // 6
	"statue",
	"tree", // 8
	"turtle",
];

const random_id = (len:number) => {
    let p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a => a + p[Math.floor(Math.random() * p.length)], '');
}

const g_origin = new URL(window.location.href).origin;
const g_id = random_id(12);
const httpPost = (page_name: string, payload: any, callback: HttpPostCallback) => {
	let request = new XMLHttpRequest();
	request.onreadystatechange = () => {
		if(request.readyState === 4)
		{
			if(request.status === 200) {
				let response_obj;
				try {
					response_obj = JSON.parse(request.responseText);
				} catch(err) {}
				if (response_obj) {
					callback(response_obj);
				} else {
					callback({
						status: 'error',
						message: 'response is not valid JSON',
						response: request.responseText,
					});
				}
			} else {
				if(request.status === 0 && request.statusText.length === 0) {
					callback({
						status: 'error',
						message: 'connection failed',
					});
				} else {
					callback({
						status: 'error',
						message: `server returned status ${request.status}: ${request.statusText}`,
					});
				}
			}
		}
	};
	request.open('post', `${g_origin}/${page_name}`, true);
	request.setRequestHeader('Content-Type', 'application/json');
	request.send(JSON.stringify(payload));
}

class Sprite 
{
	name: string;
	x: number;
	y: number;
	speed: number;
	dest_x: number;
	dest_y: number;
	image: HTMLImageElement;
	onclick:OnclickHandler;
	update:UpdateHandler;
	id:string;

	constructor(name:string, x:number, y:number, id:string, image_url:string, update_method:UpdateHandler, onclick_method:OnclickHandler) {
		//add name variable
		this.name = name;
		this.x = x;
		this.y = y;
        this.speed = 4;
		this.image = new Image();
		this.image.src = image_url;
		this.update = update_method;
		this.onclick = onclick_method;
		this.dest_x = this.x;
		this.dest_y = this.y;
		this.id = id;
	}

	set_destination(x:number, y:number){
		this.dest_x = x;
		this.dest_y = y;
	}	

	ignore_click(x:number, y:number){
	}	

	move(dx:number, dy:number) {
		this.dest_x = this.x + dx;
		this.dest_y = this.y + dy;
	}

	go_toward_destination(){
		if(this.dest_x === undefined)
			return;
		if(this.x < this.dest_x)
			this.x += Math.min(this.dest_x - this.x, this.speed);
		else if(this.x > this.dest_x)
			this.x -= Math.min(this.x - this.dest_x, this.speed);
		if(this.y < this.dest_y)
			this.y += Math.min(this.dest_y - this.y, this.speed);
		else if(this.y > this.dest_y)
			this.y -= Math.min(this.y - this.dest_y, this.speed);
	}	
	sit_still(){
	}
}

class Model {
	sprites:Sprite[];
	avatar:Sprite;
	map:any;

	constructor() {
		this.sprites = [];
		this.avatar = new Sprite(nName, 80,150, g_id, "blue_robot.png", Sprite.prototype.go_toward_destination, Sprite.prototype.set_destination);
		this.sprites.push(this.avatar);
		id_to_sprites[g_id] = this.avatar;
	}

	update() {
		for (const sprite of this.sprites) {
			sprite.update();
		}	
	}

	onclick(x:number, y:number) {
		for (const sprite of this.sprites) {
			sprite.onclick(x, y);
		}
	}

	move(dx:number, dy:number) {
		this.avatar.move(dx, dy);
	}

	updateMap(ob:any){
		if (ob && ob.map) {
			this.map = ob.map;
		}
	}
}

class View
{
	model:Model;
	canvas:HTMLCanvasElement;
	
	constructor(model:Model) {
		this.model = model;
		this.canvas = document.getElementById("myCanvas") as unknown as HTMLCanvasElement;	
	}

	drawMap(ob: any) {
        let ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		
        for (const object of ob.map.things) {
            const index = object.kind; 
            const image = new Image();
			image.onload = () => {
				ctx.drawImage(image, object.x - g_scroll_x, object.y - g_scroll_y);
			};
			image.src = `images/${thing_names[index]}.png`;
		}
    }

	update() {
		let ctx = this.canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, 1000, 500);
		for (const sprite of this.model.sprites) {
			ctx.font = "20px Verdana";
			ctx.drawImage(sprite.image, sprite.x - sprite.image.width / 2 - g_scroll_x, sprite.y - sprite.image.height - g_scroll_y);
			ctx.fillText(sprite.name, sprite.x - sprite.image.width / 2 - g_scroll_x, sprite.y - sprite.image.height - 10 - g_scroll_y);
		}

		const center_x = 500;
        const center_y = 270; 
        const scroll_rate = 0.03;

		g_scroll_x += scroll_rate * (this.model.avatar.x - g_scroll_x - center_x);
		g_scroll_y += scroll_rate * (this.model.avatar.y - g_scroll_y - center_y);
	}
}

class Controller
{
	key_right: boolean;
	key_left: boolean;
	key_up: boolean;
	key_down: boolean;
	model:Model;
	view:View;
	last_updates_request_time:number;

	constructor(model:Model, view:View) {
		this.model = model;
		this.view = view;
		this.key_right = false;
		this.key_left = false;
		this.key_up = false;
		this.key_down = false;
		let self = this;
		this.last_updates_request_time = 0;
		view.canvas.addEventListener("click", function(event) { self.onClick(event); });
		document.addEventListener('keydown', function(event) { self.keyDown(event); }, false);
		document.addEventListener('keyup', function(event) { self.keyUp(event); }, false);
	}

	onClick(event:MouseEvent) {
		const x = event.pageX - this.view.canvas.offsetLeft + g_scroll_x;
		const y = event.pageY - this.view.canvas.offsetTop + g_scroll_y;
		this.model.onclick(x, y);

		httpPost('ajax.html', {
			action: 'move',
			id: g_id,
			x: x,
			y: y,
			name: nName,
		}, this.onAcknowledgeClick);
	}

	keyDown(event:KeyboardEvent) {
		if(event.keyCode == 39) this.key_right = true;
		else if(event.keyCode == 37) this.key_left = true;
		else if(event.keyCode == 38) this.key_up = true;
		else if(event.keyCode == 40) this.key_down = true;	
	}

	keyUp(event:KeyboardEvent) {
		if(event.keyCode == 39) this.key_right = false;
		else if(event.keyCode == 37) this.key_left = false;
		else if(event.keyCode == 38) this.key_up = false;
		else if(event.keyCode == 40) this.key_down = false;
	}

	on_receive_updates(ob: any) {
		console.log(`ob: ${JSON.stringify(ob)}`);
		if(ob === null || ob === undefined) {
			return;
		}

		for (let i = 0; i < ob.updates.length; i++) {
			let up = ob.updates[i];
			let id = up.id; //up.id
			let x = up.x; //up.x
			let y = up.y;
			let sprite = id_to_sprites[id];
			
			console.log(this.model.sprites);
			console.log(id_to_sprites);

			if(sprite === undefined) {
				sprite = new Sprite(ob.updates[i].name, 80, 150, g_id, "green_robot.png", Sprite.prototype.go_toward_destination, Sprite.prototype.ignore_click);
				this.model.sprites.push(sprite);
				id_to_sprites[id] = sprite;
			}
			sprite.set_destination(x, y);
		}

		if (ob.status === 'error') {
			console.log(`!!! Server replied: ${ob.message}`);
			return;
		  }
		count(ob);

		if(ob.chats) {
			const chatWindow = document.getElementById("chatWindow") as HTMLSelectElement;

			for(let i = 0; i < ob.chats.length; i++) {
				const message = ob.chats[i];
				const option = document.createElement("option");
				option.text = message;

				chatWindow.add(option);
				option.scrollIntoView();
			}
		}
	}

	request_updates() {
		let payload = {
			id: g_id,
			action: "update",
		}
		httpPost("ajax.html", payload, (ob) => this.on_receive_updates(ob));
	}

	update() {
		let dx = 0;
		let dy = 0;
        let speed = this.model.avatar.speed;
		if(this.key_right) dx += speed;
		if(this.key_left) dx -= speed;
		if(this.key_up) dy -= speed;
		if(this.key_down) dy += speed;
		if(dx != 0 || dy != 0)
			this.model.move(dx, dy);

		const time = Date.now();
		if (time - this.last_updates_request_time >= 1000) {
			this.last_updates_request_time = time;
			this.request_updates();
		}
	}

	onAcknowledgeClick(ob: any) {
		console.log(`Response to move: ${JSON.stringify(ob)}`);

		if (ob.status === 'error') {
			console.log(`!!! Server replied: ${ob.message}`);
			return;
		}
	}
}

function count(ob:any) {
	if(ob.gold !== undefined && ob.bananas !== undefined){
		const gold = document.getElementById('gold') as HTMLElement;
		const banana = document.getElementById('bananas') as HTMLElement;

		if(gold && banana) {
			gold.innerText = ob.gold;
			banana.innerText = ob.bananas;
		}
	}
}

class Game {
	model:Model;
	view:View;
	controller:Controller;
	constructor() {
		this.model = new Model();
		this.view = new View(this.model);
		this.controller = new Controller(this.model, this.view);
	}

	onTimer() {
		this.controller.update();
		this.model.update();
		this.view.update();
	}
}

let s: string[] = [];
s.push(`<h1>Banana Quest: The Potassium Crisis</h1>`);
s.push(`<p>In a land known as "Fruitopia," the inhabitants thrived on the delicious and nutritious fruits that grew abundantly.`);	
s.push(`One fruit, in particular, was highly treasured - the mighty banana.`);	
s.push(`Fruitopia's inhabitants had always enjoyed the health benefits and energy provided by this potassium-rich treat,`);	 
s.push(`which fueled their daily adventures and brought joy to their lives.`);	
s.push(`<p>But one day, a mysterious phenomenon occurred: the banana crops across Fruitopia began to wither,`);	
s.push(`and the supply of this essential fruit dwindled rapidly.`);	
s.push(`As the days passed, the once energetic and lively inhabitants of Fruitopia started to feel weak and fatigued.`);	
s.push(`The doctors and scientists of the land quickly identified the cause - a severe potassium deficiency was spreading among the residents,`);	 
s.push(`and it threatened to plunge Fruitopia into a state of perpetual lethargy.`);	
s.push(`Desperate to restore the health and vitality of their beloved land,`);	 
s.push(`the citizens of Fruitopia are turning to you to help them find 20 bananas.`);	
s.push(`The fate of Fruitopia hangs in the balance.`);	
s.push(`<p>tl;dr: Find 20 bananas to win.`);
s.push(`<p>If you are willing to undertake this noble quest, please enter your name:`);
s.push(`<input type="text" id="myInput" name="inputName" />`);
s.push(`<button id="getNameButton">Submit</button>`);

const content = document.getElementById('content')  as unknown as HTMLCanvasElement;
content.innerHTML = s.join('');
const submitButton = document.getElementById('getNameButton') as HTMLInputElement;

submitButton.addEventListener('click', () => {
	const inputElement = document.getElementById('myInput') as HTMLInputElement;
	const inputName = inputElement.value;
	nName = inputName;

	let s: string[] = [];
	s.push(`<canvas id="myCanvas" width="1000" height="500" style="border:1px solid #cccccc; background-color: skyblue;">`);
	s.push(`</canvas>`);	
	s.push('<br><big><big><b>');
	s.push(`Gold: <span id="gold">0</span>	`);
	s.push(`Bananas: <span id="bananas">0</span>`);
	s.push('</b></big></big><br>');
	s.push('<select id="chatWindow" size="8" style="width:1000px"></select>');
	s.push('<br>');
    s.push('<input type="input" id="chatMessage"></input>');
    s.push('<button onclick="postChatMessage()">Post</button>');
	const content = document.getElementById('content')  as unknown as HTMLCanvasElement;
	content.innerHTML = s.join('');

	httpPost('ajax.html', {
		action: 'get_map',
	}, (ob) => {return onReceiveMap(ob)});

	let game = new Game();

	let timer = setInterval(() => { 
		game.onTimer(); 
	}, 40);

	function onReceiveMap(ob: any) {
		const item = ob.map.things;

		for(let i = 0; i < item.length; i++) {
			game.model.sprites.push(new Sprite("", item[i].x,item[i].y, item[i].kind, `images/${thing_names[item[i].kind]}.png`, Sprite.prototype.sit_still, Sprite.prototype.ignore_click));
		}
	}
});

function postChatMessage() {
	const tText = (document.getElementById("chatMessage") as HTMLInputElement).value;
	
	httpPost('ajax.html', {
		action: 'chat',
		id: g_id,
		text:tText,
	}, (ob) => {console.log(ob.status)});
}

