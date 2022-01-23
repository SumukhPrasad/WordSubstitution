<script>
	import WordInput from "./components/WordInput.svelte";
	import WordMeanings from "./components/WordMeanings.svelte";
</script>

<svelte:head>
	<style>
		body {
			width: 600px;
			height: 300px;
		}
	</style>
</svelte:head>
<main>
	<WordInput />
	<WordMeanings />
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		background-color: #eee;
	}
</style>