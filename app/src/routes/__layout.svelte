<script>
	import '../app.css';
	import { base, assets } from '$app/paths';
	console.log(base);
	console.log(assets);
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { walletStore, initialize } from '$lib/stores/wallet/walletStore';

	const wallet = initialize().then();
</script>

<div>
	<div class="w-full max-w-3xl lg:max-w-4xl mx-auto">
		<Sidebar />
		<main class="container mx-auto my-6 max-w-lg">
			<header class="flex space-x-6 items-center justify-between px-8 py-4 border-b">
				<div class="text-xl font-bold" />
			</header>
			<slot />
		</main>
	</div>
</div>
