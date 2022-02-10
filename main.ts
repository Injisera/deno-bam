const pool:Worker[] = [];
const n = 1000;
const threads = 50;//for some reason a few like 5 performs way better than 20 which performs waaaay better than 200

const office = {
	n:n,
	sync:new SharedArrayBuffer(3*Uint32Array.BYTES_PER_ELEMENT),//[row to multiply, write/read from/to odd/even, wake up main thread]
	bam:new SharedArrayBuffer((n*n+n)*Float64Array.BYTES_PER_ELEMENT),
	odd:new SharedArrayBuffer(n*Float64Array.BYTES_PER_ELEMENT),//odd = sigmoid(bam*even+bias)
	even:new SharedArrayBuffer(n*Float64Array.BYTES_PER_ELEMENT)//even = sigmoid(bam*odd+bias)
}

const sync = new Int32Array(office.sync);
const bam = new Float64Array(office.bam);
const state = [new Float64Array(office.even), new Float64Array(office.odd)];

for(let i=0;i<n*n+n;++i){bam[i]=Math.sin(i);}//fill with some garbage data
for(let i=0;i<n;++i){state[0][i]=Math.sin(i+2);state[1][i]=Math.cos(i+2);}//and some more garbage data

sync[1]=0;//write from even and write to odd, or vice versa
sync[2]=0;//notification for main

for(let i=0;i<threads;++i){
	const worker = new Worker(new URL("./app/worker.ts", import.meta.url).href, { type: "module" });
	pool.push(worker);
	worker.postMessage(office);
}

const calc = async (N=n) => {
	sync[0]=n;
	sync[1]^=1;//toggle between 1 and 0
	Atomics.notify(sync,0,N);//makes no sense to wake up more threads than amount of work
	Atomics.wait(sync,2,0);
}

for(let j=1;j<20;++j){
	const t0 = Date.now();
	for(let i=0;i<n;++i){//pretend we're doing an n by n * n by n square matrix multiplication
		calc(j);
		//in here we could totally set some data in the "from" array and read some other indexes from the to data 
	}
	console.log(`[${n},${n+1}]*[${n}] ${n} times with ${j} threads\nt1-t0 = ${Date.now()-t0}ms`)
}

Deno.exit(0)