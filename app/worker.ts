import "./worker.d.ts";

self.onmessage = (e:MessageEvent) => {//init
	const n = e.data.n;
	const sync = new Int32Array(e.data.sync);
	const bam = new Float64Array(e.data.bam);
	const [even,odd] = [new Float64Array(e.data.even), new Float64Array(e.data.odd)];
	let from=even,to=odd;

	while(1){//
		if(Atomics.wait(sync,0,0) == "ok"){//if we've been woken up
			if(sync[1]){//then get the from and to variables ONCE
				from=even;
				to=odd;
			}else{
				from=odd;
				to=even;
			}
		}
		const row = Atomics.sub(sync,0,1)-1;

		let offset = n*row;
		let sum = bam[offset++];//bias

		for(let i=0;i<n;++i){
			sum+=bam[offset+i]*from[i];//matrix multiplication
		}
		to[row]=Math.tanh(sum);//sigmoid function
		if(!row){Atomics.notify(sync,2);}//Give back control to main thread if we've done all work
	}
};
